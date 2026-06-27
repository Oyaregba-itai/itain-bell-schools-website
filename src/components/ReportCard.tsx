import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer, X, Download } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";

interface ReportCardProps {
  studentId: string;
  termId: string;
  resultType: "mid_term" | "end_of_term";
  onClose?: () => void;
  inline?: boolean;
  autoPrint?: boolean;
}

const GRADE_SCALE = [
  { min: 95,  max: 100,  letter: "A+", remark: "Outstanding", color: "#7B2D8B", range: "95 – 100"  },
  { min: 90,  max: 94.9, letter: "A",  remark: "Outstanding", color: "#4a0e6e", range: "90 – 94.9" },
  { min: 85,  max: 89.9, letter: "B+", remark: "Proficient",  color: "#166534", range: "85 – 89.9" },
  { min: 80,  max: 84.9, letter: "B",  remark: "Proficient",  color: "#166534", range: "80 – 84.9" },
  { min: 75,  max: 79.9, letter: "C+", remark: "Capable",     color: "#1e40af", range: "75 – 79.9" },
  { min: 70,  max: 74.9, letter: "C",  remark: "Capable",     color: "#1e40af", range: "70 – 74.9" },
  { min: 60,  max: 69.9, letter: "D",  remark: "PTE",         color: "#c2410c", range: "60 – 69.9" },
  { min: 0,   max: 59.9, letter: "E",  remark: "NME",         color: "#b91c1c", range: "0 – 59.9"  },
];

// All grade lookups now work on percentage (0–100)
const getGradeInfo = (pct: number) =>
  GRADE_SCALE.find((g) => pct >= g.min && pct <= g.max) ?? GRADE_SCALE[GRADE_SCALE.length - 1];

const ReportCard = ({ studentId, termId, resultType, onClose, inline, autoPrint }: ReportCardProps) => {
  const autoPrinted = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["report-card", studentId, termId, resultType],
    queryFn: async () => {
      const [studentRes, termRes, resultsRes, submissionRes] = await Promise.all([
        supabase.from("students").select("*").eq("id", studentId).single(),
        supabase.from("terms").select("*").eq("id", termId).single(),
        supabase.from("results").select("id, subject_id, term_id, result_type, student_id, total_score, portfolio_score, exam_score, grade_letter, teacher_comments, did_not_participate, uploaded_by, created_at").eq("student_id", studentId).eq("term_id", termId).eq("result_type", resultType),
        supabase.from("report_submissions").select("head_teacher_comment, head_of_school_comment, approved_by, days_present, days_open, next_term_begins").eq("student_id", studentId).eq("term_id", termId).eq("result_type", resultType).maybeSingle(),
      ]);
      if (studentRes.error) throw studentRes.error;

      // Get class name and head teacher (flat queries — no FK joins)
      let className = "—";
      let headTeacherName = "";
      let headTeacherSignatureUrl = "";
      let headOfSchoolSignatureUrl = "";
      let isCommentMode = false;
      if (studentRes.data?.class_id) {
        const { data: cls } = await supabase.from("classes").select("name, head_teacher_id, report_format").eq("id", studentRes.data.class_id).single();
        className = cls?.name || "—";
        isCommentMode = cls?.report_format === "comment";
        if (cls?.head_teacher_id) {
          const { data: headProfile } = await supabase.from("profiles").select("full_name, signature_url").eq("user_id", cls.head_teacher_id).maybeSingle();
          headTeacherName = headProfile?.full_name || "";
          headTeacherSignatureUrl = headProfile?.signature_url || "";
        }
      }

      // Get head of school signature — fetch from the super admin who has uploaded one
      const { data: hosProfile } = await supabase.from("profiles").select("signature_url").eq("is_super_admin", true).not("signature_url", "is", null).limit(1).maybeSingle();
      headOfSchoolSignatureUrl = hosProfile?.signature_url || "";

      // Get subject names
      const results = resultsRes.data || [];
      const subjectIds = [...new Set(results.map((r: any) => r.subject_id).filter(Boolean))];
      let subjectMap: Record<string, string> = {};
      if (subjectIds.length > 0) {
        const { data: subs } = await supabase.from("subjects").select("id, name").in("id", subjectIds as string[]);
        (subs || []).forEach((s: any) => { subjectMap[s.id] = s.name; });
      }

      // Class stats (highest/lowest per subject)
      const classId = studentRes.data?.class_id;
      const { data: classStudents } = await supabase.from("students").select("id").eq("class_id", classId);
      const classStudentIds = (classStudents || []).map((s: any) => s.id);
      const { data: classResults } = await supabase.from("results").select("subject_id, total_score")
        .eq("term_id", termId).eq("result_type", resultType).in("student_id", classStudentIds);

      const subjectStats: Record<string, { highest: number; lowest: number }> = {};
      (classResults || []).forEach((r: any) => {
        if (r.total_score == null) return;
        const score = Number(r.total_score);
        if (!subjectStats[r.subject_id]) subjectStats[r.subject_id] = { highest: score, lowest: score };
        else {
          subjectStats[r.subject_id].highest = Math.max(subjectStats[r.subject_id].highest, score);
          subjectStats[r.subject_id].lowest = Math.min(subjectStats[r.subject_id].lowest, score);
        }
      });

      // Fetch sibling terms (same academic year) for cumulative data — end_of_term only
      let yearTerms: any[] = [];
      let termOrder = 0;
      let prevTermResults: any[] = [];
      if (termRes.data?.academic_year) {
        const { data: yt } = await supabase
          .from("terms")
          .select("id, name, start_date")
          .eq("academic_year", termRes.data.academic_year)
          .order("start_date", { ascending: true });
        yearTerms = yt || [];
        termOrder = yearTerms.findIndex((t: any) => t.id === termId);
        const prevTermIds = yearTerms.slice(0, termOrder < 0 ? yearTerms.length : termOrder).map((t: any) => t.id);
        if (prevTermIds.length > 0) {
          const { data: pr } = await supabase
            .from("results")
            .select("term_id, subject_id, total_score")
            .eq("student_id", studentId)
            .eq("result_type", "end_of_term")
            .in("term_id", prevTermIds);
          prevTermResults = pr || [];
        }
      }

      return {
        student: { ...studentRes.data, className },
        term: termRes.data,
        results: results.map((r: any) => ({ ...r, subjectName: subjectMap[r.subject_id] || "—" })),
        subjectStats,
        headTeacherComment: submissionRes.data?.head_teacher_comment || "",
        headOfSchoolComment: submissionRes.data?.head_of_school_comment || "",
        headTeacherName,
        headTeacherSignatureUrl,
        headOfSchoolSignatureUrl,
        isCommentMode: isCommentMode ?? false,
        daysOpen: submissionRes.data?.days_open ?? null,
        daysPresent: submissionRes.data?.days_present ?? null,
        nextTermBegins: submissionRes.data?.next_term_begins ?? null,
        yearTerms,
        termOrder,
        prevTermResults,
      };
    },
  });

  const handleDownload = async () => {
    if (!contentRef.current || !data) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgRatio = canvas.width / canvas.height;
      let w = pageW;
      let h = pageW / imgRatio;
      if (h > pageH) { h = pageH; w = pageH * imgRatio; }
      pdf.addImage(imgData, "PNG", (pageW - w) / 2, 0, w, h);
      const studentName = (data as any).student?.full_name || "student";
      const termName = (data as any).term?.name || "term";
      const label = resultType === "mid_term" ? "Mid_Term" : "End_of_Term";
      pdf.save(`${studentName}_${termName}_${label}.pdf`.replace(/\s+/g, "_"));
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    if (!data) return;
    const { student, term, results, subjectStats, headTeacherComment, headOfSchoolComment, headTeacherName, headTeacherSignatureUrl, headOfSchoolSignatureUrl, isCommentMode, daysOpen, daysPresent, nextTermBegins, yearTerms, termOrder, prevTermResults } = data;
    const isEndOfTerm = resultType === "end_of_term";
    const scoredResults = results.filter((r: any) => !r.did_not_participate);
    const hasNewFormat = isEndOfTerm && scoredResults.some((r: any) => r.portfolio_score != null);
    const outOf = isEndOfTerm ? (hasNewFormat ? 100 : 70) : 30;
    const totalObtainable = scoredResults.length * outOf;
    const totalObtained = scoredResults.reduce((s: number, r: any) => s + Number(r.total_score || 0), 0);
    const totalPct = totalObtainable > 0 ? (totalObtained / totalObtainable) * 100 : 0;
    const overallGrade = getGradeInfo(totalPct);
    const average = scoredResults.length > 0 ? totalObtained / scoredResults.length : 0;
    const studentName = student.full_name || `${student.first_name || ""} ${student.last_name || ""}`.trim();
    const gender = student.gender ? String(student.gender).toUpperCase() : "—";
    const dob = student.date_of_birth;
    const age = dob ? `${new Date().getFullYear() - new Date(dob).getFullYear()} YEARS` : "—";
    const termName = (term as any)?.name || "—";
    const session = (term as any)?.academic_year || "—";
    const reportHeader = resultType === "mid_term" ? "MID TERM REPORT SHEET" : "END OF TERM REPORT SHEET";
    const scoreLabel = resultType === "mid_term" ? "Mid Term" : "End of Term";
    const logoAbsUrl = new URL(schoolLogo, window.location.href).href;
    const photoUrl = student.avatar_url || "";
    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    // Build per-subject previous term lookup
    const prevBySubject: Record<string, number[]> = {};
    (prevTermResults || []).forEach((pr: any) => {
      const termIdx = (yearTerms || []).findIndex((t: any) => t.id === pr.term_id);
      if (termIdx < 0) return;
      if (!prevBySubject[pr.subject_id]) prevBySubject[pr.subject_id] = [];
      prevBySubject[pr.subject_id][termIdx] = Number(pr.total_score || 0);
    });

    const subjectColspan = isEndOfTerm ? 8 : 5;
    const subjectRows = results.map((r: any, i: number) => {
      const bg = i % 2 === 0 ? "#fff" : "#f8f9fa";
      const stats = subjectStats[r.subject_id];
      if (r.did_not_participate) {
        return `<tr style="background:${bg}">
          <td style="padding:5px 8px;border-bottom:1px solid #ddd">${r.subjectName}</td>
          <td colspan="${subjectColspan}" style="padding:5px 8px;border-bottom:1px solid #ddd;text-align:center;color:#888;font-style:italic">Did not take part</td>
        </tr>`;
      }
      const total = Number(r.total_score || 0);
      const pct = isEndOfTerm ? (hasNewFormat ? total : (total / 70) * 100) : (total / 30) * 100;
      const g = getGradeInfo(pct);

      if (isEndOfTerm) {
        const portfolio = r.portfolio_score != null ? Number(r.portfolio_score) : "—";
        const exam = r.exam_score != null ? Number(r.exam_score) : "—";
        const test = (r.portfolio_score != null && r.exam_score != null)
          ? Math.max(0, total - Number(r.portfolio_score) - Number(r.exam_score))
          : "—";
        const prevScores = prevBySubject[r.subject_id] || [];
        const term1 = prevScores[0] != null ? prevScores[0] : "—";
        const term2 = prevScores[1] != null ? prevScores[1] : "—";
        const cumulative = [term1, term2, total].every(v => v !== "—")
          ? (Number(term1) + Number(term2) + total) : "—";
        return `<tr style="background:${bg}">
          <td style="padding:4px 6px;border-bottom:1px solid #ddd">${r.subjectName}</td>
          <td style="padding:4px 5px;border-bottom:1px solid #ddd;text-align:center">${portfolio}</td>
          <td style="padding:4px 5px;border-bottom:1px solid #ddd;text-align:center">${test}</td>
          <td style="padding:4px 5px;border-bottom:1px solid #ddd;text-align:center">${exam}</td>
          <td style="padding:4px 5px;border-bottom:1px solid #ddd;text-align:center;font-weight:bold">${total}</td>
          <td style="padding:4px 5px;border-bottom:1px solid #ddd;text-align:center;font-weight:bold;color:${g.color}">${g.letter}</td>
          <td style="padding:4px 5px;border-bottom:1px solid #ddd;font-weight:bold;color:${g.color}">${g.remark}</td>
          <td style="padding:4px 5px;border-bottom:1px solid #ddd;text-align:center">${stats?.highest ?? "—"}</td>
          <td style="padding:4px 5px;border-bottom:1px solid #ddd;text-align:center">${stats?.lowest ?? "—"}</td>
          <td style="padding:4px 5px;border-bottom:1px solid #ddd;text-align:center">${term1}</td>
          <td style="padding:4px 5px;border-bottom:1px solid #ddd;text-align:center">${term2}</td>
          <td style="padding:4px 5px;border-bottom:1px solid #ddd;text-align:center;font-weight:bold">${cumulative}</td>
        </tr>`;
      }
      return `<tr style="background:${bg}">
        <td style="padding:5px 8px;border-bottom:1px solid #ddd">${r.subjectName}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #ddd;text-align:center">${total}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #ddd;text-align:center;font-weight:bold;color:${g.color}">${g.letter}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #ddd;font-weight:bold;color:${g.color}">${g.remark}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #ddd;text-align:center">${stats?.highest ?? "—"}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #ddd;text-align:center">${stats?.lowest ?? "—"}</td>
      </tr>`;
    }).join("");

    const bars = scoredResults.map((r: any) => {
      const score = Number(r.total_score || 0);
      const pct = isEndOfTerm ? (hasNewFormat ? score : (score / 70) * 100) : (score / 30) * 100;
      const g = getGradeInfo(pct);
      const h = Math.max(2, Math.round((pct / 100) * 70));
      const name = r.subjectName.substring(0, 8);
      return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:0">
        <div style="font-size:6px;margin-bottom:1px">${score}</div>
        <div style="width:100%;background:${g.color};height:${h}px;min-height:2px"></div>
        <div style="font-size:5.5px;text-align:center;margin-top:2px;overflow:hidden;white-space:nowrap;max-width:100%">${name}</div>
      </div>`;
    }).join("");

    const gradeKeyRows = GRADE_SCALE.map(g =>
      `<tr><td style="padding:2px 5px;border:1px solid #ccc">${g.range}</td>
      <td style="padding:2px 5px;border:1px solid #ccc;text-align:center;font-weight:bold;color:${g.color}">${g.letter}</td>
      <td style="padding:2px 5px;border:1px solid #ccc">${g.remark}</td>
      <td style="padding:2px 5px;border:1px solid #ccc;background:${g.color};color:white;text-align:center">&nbsp;</td></tr>`
    ).join("");

    if (isCommentMode) {
      const commentRows = results.map((r: any, i: number) => {
        const bg = i % 2 === 0 ? "#fff" : "#f8f9fa";
        return `<tr style="background:${bg}">
          <td style="padding:5px 8px;border-bottom:1px solid #ddd">${r.subjectName}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #ddd">${r.teacher_comments || ""}</td>
        </tr>`;
      }).join("");
      const daysAbsent = (daysOpen != null && daysPresent != null) ? daysOpen - daysPresent : "—";
      const commentHtml = `<!DOCTYPE html><html><head><title>${studentName} — ${reportHeader}</title>
      <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:12px}
      @media print{body{padding:0}@page{margin:8mm;size:A4}}table{border-collapse:collapse}</style>
      </head><body>
      <table style="width:100%;border:2px solid #333;margin-bottom:0"><tr>
        <td style="border:1px solid #333;padding:6px;text-align:center;width:75px" rowspan="2">
          <img src="${logoAbsUrl}" style="height:55px;max-width:65px" onerror="this.style.display='none'">
        </td>
        <td style="border:1px solid #333;text-align:center;padding:6px 8px">
          <div style="font-size:18px;font-weight:bold;letter-spacing:5px">I T A I N - B E L L &nbsp; S C H O O L S</div>
          <div style="font-size:9px;margin-top:3px;color:#444">7, Mustapha Street, Off Olanrewaju or Olayiwola Street, Oregun, Ikeja, Lagos.</div>
        </td></tr><tr>
        <td style="border:1px solid #333;text-align:center;padding:5px 8px;background:#d6e8f7">
          <strong>${termName.toUpperCase()} ${reportHeader} ${session} SESSION</strong>
        </td></tr></table>
      <table style="width:100%;border:2px solid #333;border-top:0;margin-bottom:0"><tr>
        <td style="border:1px solid #333;padding:4px;text-align:center;width:75px;vertical-align:middle" rowspan="3">
          ${photoUrl ? `<img src="${photoUrl}" style="width:65px;height:80px;object-fit:cover">` : `<div style="width:65px;height:80px;background:#eee;display:flex;align-items:center;justify-content:center;font-size:8px;color:#999">No Photo</div>`}
        </td>
        <td style="border:1px solid #333;padding:4px 8px;width:22%"><strong>Name:</strong></td>
        <td style="border:1px solid #333;padding:4px 8px" colspan="2"><strong>${studentName}</strong></td></tr><tr>
        <td style="border:1px solid #333;padding:4px 8px"><strong>Sex:</strong></td>
        <td style="border:1px solid #333;padding:4px 8px">${gender}</td>
        <td style="border:1px solid #333;padding:4px 8px"></td></tr><tr>
        <td style="border:1px solid #333;padding:4px 8px"><strong>Class:</strong></td>
        <td style="border:1px solid #333;padding:4px 8px">${student.className}</td>
        <td style="border:1px solid #333;padding:4px 8px"><strong>Age:</strong> ${age}</td>
      </tr></table>
      <table style="width:100%;border:2px solid #333;border-top:0;margin-bottom:0"><tr>
        <td style="border:1px solid #333;padding:0;vertical-align:top;width:62%">
          <table style="width:100%;border-collapse:collapse;font-size:10px"><thead>
            <tr style="background:#d6e8f7">
              <th style="padding:5px 8px;border-bottom:1px solid #333;text-align:left;width:35%">SUBJECTS</th>
              <th style="padding:5px 8px;border-bottom:1px solid #333;text-align:left">COMMENTS</th>
            </tr></thead><tbody>${commentRows}</tbody></table>
        </td>
        <td style="border:1px solid #333;padding:10px 12px;vertical-align:top;width:38%">
          <table style="width:100%;border-collapse:collapse;font-size:10px">
            <tr><td style="padding:5px 0;border-bottom:1px solid #eee;font-weight:bold">Days School Open:</td><td style="padding:5px 0;border-bottom:1px solid #eee;text-align:right">${daysOpen ?? "—"}</td></tr>
            <tr><td style="padding:5px 0;border-bottom:1px solid #eee;font-weight:bold">Days Present:</td><td style="padding:5px 0;border-bottom:1px solid #eee;text-align:right">${daysPresent ?? "—"}</td></tr>
            <tr><td style="padding:5px 0;border-bottom:1px solid #eee;font-weight:bold">Days Absent:</td><td style="padding:5px 0;border-bottom:1px solid #eee;text-align:right">${daysAbsent}</td></tr>
            <tr><td style="padding:5px 0;font-weight:bold">Next Term Begins:</td><td style="padding:5px 0;text-align:right;font-size:9px">${nextTermBegins ?? "—"}</td></tr>
          </table>
        </td></tr></table>
      <table style="width:100%;border:2px solid #333;border-top:0;margin-bottom:0"><tr>
        <td colspan="3" style="border:1px solid #333;padding:2px 8px;background:#ebebeb;font-weight:bold;font-size:10px">Class Teacher Comments</td></tr><tr>
        <td style="border:1px solid #333;padding:5px 8px;width:50%;font-size:10px">${headTeacherComment}</td>
        <td style="border:1px solid #333;padding:5px 8px;font-size:10px">Date: ${today}</td>
        <td style="border:1px solid #333;padding:5px 8px;font-size:10px">${headTeacherSignatureUrl ? `<img src="${headTeacherSignatureUrl}" style="height:28px;max-width:90px;object-fit:contain" alt="signature" />` : "Signature: ___________"}</td></tr><tr>
        <td colspan="3" style="border:1px solid #333;padding:5px 8px;font-size:10px"><strong>Class Teacher:</strong> ${headTeacherName || "—"}</td></tr></table>
      <table style="width:100%;border:2px solid #333;border-top:0"><tr>
        <td colspan="3" style="border:1px solid #333;padding:2px 8px;background:#ebebeb;font-weight:bold;font-size:10px">Head of School Comments</td></tr><tr>
        <td style="border:1px solid #333;padding:5px 8px;width:50%;font-size:10px">${headOfSchoolComment}</td>
        <td style="border:1px solid #333;padding:5px 8px;font-size:10px">Date: ${today}</td>
        <td style="border:1px solid #333;padding:5px 8px;font-size:10px">${headOfSchoolSignatureUrl ? `<img src="${headOfSchoolSignatureUrl}" style="height:28px;max-width:90px;object-fit:contain" alt="signature" />` : "Signature: ___________"}</td></tr><tr>
        <td colspan="3" style="border:1px solid #333;padding:5px 8px;font-size:10px"><strong>Acting Head of School:</strong> Mrs Goodness Duru</td></tr></table>
      </body></html>`;
      const win = window.open("", "_blank", "width=900,height=1100");
      if (!win) return;
      win.document.write(commentHtml);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
      return;
    }

    const sharedHeader = `
    <table style="width:100%;border:2px solid #333;margin-bottom:0"><tr>
      <td style="border:1px solid #333;padding:6px;text-align:center;width:75px" rowspan="2">
        <img src="${logoAbsUrl}" style="height:55px;max-width:65px" onerror="this.style.display='none'">
      </td>
      <td style="border:1px solid #333;text-align:center;padding:6px 8px">
        <div style="font-size:18px;font-weight:bold;letter-spacing:5px">I T A I N - B E L L &nbsp; S C H O O L S</div>
        <div style="font-size:9px;margin-top:3px;color:#444">7, Mustapha Street, Off Olanrewaju or Olayiwola Street, Oregun, Ikeja, Lagos.</div>
      </td></tr><tr>
      <td style="border:1px solid #333;text-align:center;padding:5px 8px;background:#d6e8f7">
        <strong>${termName.toUpperCase()} ${reportHeader} ${session} SESSION</strong>
      </td></tr></table>`;

    const sharedComments = `
    <table style="width:100%;border:2px solid #333;border-top:0;margin-bottom:0"><tr>
      <td colspan="3" style="border:1px solid #333;padding:2px 8px;background:#ebebeb;font-weight:bold;font-size:10px">Class Teacher Comments</td></tr><tr>
      <td style="border:1px solid #333;padding:5px 8px;width:50%;font-size:10px">${headTeacherComment || "—"}</td>
      <td style="border:1px solid #333;padding:5px 8px;font-size:10px">Date: ${today}</td>
      <td style="border:1px solid #333;padding:5px 8px;font-size:10px">${headTeacherSignatureUrl ? `<img src="${headTeacherSignatureUrl}" style="height:28px;max-width:90px;object-fit:contain" alt="signature" />` : "Signature: ___________"}</td></tr><tr>
      <td colspan="3" style="border:1px solid #333;padding:5px 8px;font-size:10px"><strong>Class Teacher:</strong> ${headTeacherName || "—"}</td></tr></table>
    <table style="width:100%;border:2px solid #333;border-top:0"><tr>
      <td colspan="3" style="border:1px solid #333;padding:2px 8px;background:#ebebeb;font-weight:bold;font-size:10px">Head of School Comments</td></tr><tr>
      <td style="border:1px solid #333;padding:5px 8px;width:50%;font-size:10px">${headOfSchoolComment || "—"}</td>
      <td style="border:1px solid #333;padding:5px 8px;font-size:10px">Date: ${today}</td>
      <td style="border:1px solid #333;padding:5px 8px;font-size:10px">${headOfSchoolSignatureUrl ? `<img src="${headOfSchoolSignatureUrl}" style="height:28px;max-width:90px;object-fit:contain" alt="signature" />` : "Signature: ___________"}</td></tr><tr>
      <td colspan="3" style="border:1px solid #333;padding:5px 8px;font-size:10px"><strong>Acting Head of School:</strong> Mrs Goodness Duru</td></tr></table>`;

    const daysAbsent2 = (daysOpen != null && daysPresent != null) ? daysOpen - daysPresent : "—";
    const termNames = (yearTerms || []).map((t: any) => t.name);
    const t1Label = termNames[0] ? `${termNames[0]} Score` : "1st Term";
    const t2Label = termNames[1] ? `${termNames[1]} Score` : "2nd Term";

    const htmlBody = isEndOfTerm ? `
    ${sharedHeader}
    <table style="width:100%;border:2px solid #333;border-top:0;margin-bottom:0"><tr>
      <td style="border:1px solid #333;padding:4px;text-align:center;width:70px;vertical-align:middle" rowspan="4">
        ${photoUrl ? `<img src="${photoUrl}" style="width:60px;height:75px;object-fit:cover">` : `<div style="width:60px;height:75px;background:#eee;display:flex;align-items:center;justify-content:center;font-size:8px;color:#999">No Photo</div>`}
      </td>
      <td style="border:1px solid #333;padding:3px 6px;font-weight:bold">Name:</td>
      <td style="border:1px solid #333;padding:3px 6px;font-weight:bold" colspan="3">${studentName}</td>
      <td style="border:1px solid #333;padding:3px 6px;font-weight:bold">Class:</td>
      <td style="border:1px solid #333;padding:3px 6px" colspan="2">${student.className}</td></tr><tr>
      <td style="border:1px solid #333;padding:3px 6px;font-weight:bold">Sex:</td>
      <td style="border:1px solid #333;padding:3px 6px" colspan="3">${gender}</td>
      <td style="border:1px solid #333;padding:3px 6px;font-weight:bold">Age:</td>
      <td style="border:1px solid #333;padding:3px 6px" colspan="2">${age}</td></tr><tr>
      <td style="border:1px solid #333;padding:3px 6px;font-weight:bold">Score Obtainable:</td>
      <td style="border:1px solid #333;padding:3px 6px" colspan="3">${totalObtainable}</td>
      <td style="border:1px solid #333;padding:3px 6px;font-weight:bold">Score Obtained:</td>
      <td style="border:1px solid #333;padding:3px 6px" colspan="2">${totalObtained}</td></tr><tr>
      <td style="border:1px solid #333;padding:3px 6px;font-weight:bold">Term Percentage:</td>
      <td style="border:1px solid #333;padding:3px 6px" colspan="3">${totalPct.toFixed(1)}%</td>
      <td style="border:1px solid #333;padding:3px 6px;font-weight:bold">Term Grade:</td>
      <td style="border:1px solid #333;padding:3px 6px;font-weight:bold;color:${overallGrade.color}" colspan="2">${overallGrade.letter} — ${overallGrade.remark}</td>
    </tr></table>
    <table style="width:100%;border:2px solid #333;border-top:0;margin-bottom:0"><tr>
      <td style="border:1px solid #333;padding:4px;text-align:center;font-weight:bold;background:#ebebeb">ACADEMICS (COGNITIVE DOMAIN)</td>
    </tr></table>
    <table style="width:100%;border:2px solid #333;border-top:0;margin-bottom:0">
      <thead><tr style="background:#d6e8f7;font-size:9px">
        <th style="padding:4px 6px;border:1px solid #bbb;text-align:left">SUBJECTS</th>
        <th style="padding:4px 3px;border:1px solid #bbb;text-align:center">Portfolio<br>&amp; Project<br>(10)</th>
        <th style="padding:4px 3px;border:1px solid #bbb;text-align:center">Test<br>Score<br>(30)</th>
        <th style="padding:4px 3px;border:1px solid #bbb;text-align:center">Exam<br>Score<br>(60)</th>
        <th style="padding:4px 3px;border:1px solid #bbb;text-align:center">Total<br>(100)</th>
        <th style="padding:4px 3px;border:1px solid #bbb;text-align:center">Grade</th>
        <th style="padding:4px 3px;border:1px solid #bbb;text-align:center">Remark</th>
        <th style="padding:4px 3px;border:1px solid #bbb;text-align:center">Highest<br>in Class</th>
        <th style="padding:4px 3px;border:1px solid #bbb;text-align:center">Lowest<br>in Class</th>
        <th style="padding:4px 3px;border:1px solid #bbb;text-align:center">${t1Label}<br>(100)</th>
        <th style="padding:4px 3px;border:1px solid #bbb;text-align:center">${t2Label}<br>(100)</th>
        <th style="padding:4px 3px;border:1px solid #bbb;text-align:center">Cumul.<br>(300)</th>
      </tr></thead>
      <tbody style="font-size:9px">${subjectRows}</tbody>
    </table>
    <table style="width:100%;border:2px solid #333;border-top:0;margin-bottom:0"><tr>
      <td style="border:1px solid #333;padding:10px 12px;vertical-align:top;width:50%">
        <table style="width:100%;border-collapse:collapse;font-size:9px">
          <tr style="background:#d6e8f7"><td colspan="2" style="padding:3px 6px;font-weight:bold;text-align:center">Attendance</td></tr>
          <tr><td style="padding:4px 6px;border-bottom:1px solid #eee;font-weight:bold">Days School Open:</td><td style="padding:4px 6px;border-bottom:1px solid #eee;text-align:right">${daysOpen ?? "—"}</td></tr>
          <tr><td style="padding:4px 6px;border-bottom:1px solid #eee;font-weight:bold">Days Present:</td><td style="padding:4px 6px;border-bottom:1px solid #eee;text-align:right">${daysPresent ?? "—"}</td></tr>
          <tr><td style="padding:4px 6px;border-bottom:1px solid #eee;font-weight:bold">Days Absent:</td><td style="padding:4px 6px;border-bottom:1px solid #eee;text-align:right">${daysAbsent2}</td></tr>
          <tr><td style="padding:4px 6px;font-weight:bold">Christmas Term Begins:</td><td style="padding:4px 6px;text-align:right;font-size:8px">${nextTermBegins ?? "—"}</td></tr>
        </table>
      </td>
      <td style="border:1px solid #333;padding:6px 8px;vertical-align:top;width:50%">
        <table style="width:100%;border-collapse:collapse;font-size:8px">
          <tr style="background:#333;color:white"><th style="padding:2px 4px;text-align:left">Score %</th><th style="padding:2px 4px">Grade</th><th style="padding:2px 4px">Description</th><th style="padding:2px 4px">Colour</th></tr>
          ${gradeKeyRows}
        </table>
        <div style="font-size:7.5px;margin-top:3px;color:#555">N.B: PTE = PROGRESSING TOWARDS EXPECTATION &nbsp;|&nbsp; NME = NOT MEETING EXPECTATION</div>
      </td></tr></table>
    ${sharedComments}` : `
    ${sharedHeader}
    <table style="width:100%;border:2px solid #333;border-top:0;margin-bottom:0"><tr>
      <td style="border:1px solid #333;padding:4px;text-align:center;width:75px;vertical-align:middle" rowspan="4">
        ${photoUrl ? `<img src="${photoUrl}" style="width:65px;height:80px;object-fit:cover">` : `<div style="width:65px;height:80px;background:#eee;display:flex;align-items:center;justify-content:center;font-size:8px;color:#999">No Photo</div>`}
      </td>
      <td style="border:1px solid #333;padding:4px 8px;width:22%"><strong>Name:</strong></td>
      <td style="border:1px solid #333;padding:4px 8px;width:28%"><strong>${studentName}</strong></td>
      <td style="border:1px solid #333;padding:4px 8px;width:25%"><strong>Mid Term Score Obtainable:</strong></td>
      <td style="border:1px solid #333;padding:4px 8px;font-style:italic">${totalObtainable}</td></tr><tr>
      <td style="border:1px solid #333;padding:4px 8px"><strong>Sex:</strong></td>
      <td style="border:1px solid #333;padding:4px 8px">${gender}</td>
      <td style="border:1px solid #333;padding:4px 8px"><strong>Mid Term Score Obtained:</strong></td>
      <td style="border:1px solid #333;padding:4px 8px;font-style:italic">${totalObtained}</td></tr><tr>
      <td style="border:1px solid #333;padding:4px 8px"><strong>Class:</strong></td>
      <td style="border:1px solid #333;padding:4px 8px">${student.className}</td>
      <td style="border:1px solid #333;padding:4px 8px"><strong>Mid Term Average:</strong></td>
      <td style="border:1px solid #333;padding:4px 8px;font-style:italic">${average.toFixed(2)}</td></tr><tr>
      <td style="border:1px solid #333;padding:4px 8px"><strong>Age:</strong></td>
      <td style="border:1px solid #333;padding:4px 8px">${age}</td>
      <td style="border:1px solid #333;padding:4px 8px"><strong>Mid Term Grade:</strong></td>
      <td style="border:1px solid #333;padding:4px 8px;font-weight:bold;color:${overallGrade.color}">${overallGrade.letter}</td>
    </tr></table>
    <table style="width:100%;border:2px solid #333;border-top:0;margin-bottom:0"><tr>
      <td style="border:1px solid #333;padding:4px;text-align:center;font-weight:bold;background:#ebebeb">ACADEMICS (COGNITIVE DOMAIN)</td>
    </tr></table>
    <table style="width:100%;border:2px solid #333;border-top:0;margin-bottom:0"><tr>
      <td style="border:1px solid #333;padding:0;vertical-align:top;width:58%">
        <table style="width:100%;border-collapse:collapse;font-size:10px"><thead>
          <tr style="background:#d6e8f7">
            <th style="padding:5px 8px;border-bottom:1px solid #333;text-align:left">SUBJECTS</th>
            <th style="padding:5px 4px;border-bottom:1px solid #333;text-align:center">Mid Term<br>Total (30)</th>
            <th style="padding:5px 4px;border-bottom:1px solid #333;text-align:center">Grade</th>
            <th style="padding:5px 4px;border-bottom:1px solid #333;text-align:center">Remark</th>
            <th style="padding:5px 4px;border-bottom:1px solid #333;text-align:center">Highest<br>in Class</th>
            <th style="padding:5px 4px;border-bottom:1px solid #333;text-align:center">Lowest<br>in Class</th>
          </tr></thead><tbody>${subjectRows}</tbody></table>
      </td>
      <td style="border:1px solid #333;padding:8px;vertical-align:top;width:42%">
        <div style="font-size:9px;font-weight:bold;text-align:center;margin-bottom:4px">Mid Term Total (30)</div>
        <div style="display:flex;align-items:flex-end;height:75px;gap:1px;border-left:1px solid #999;border-bottom:1px solid #999;padding:0 2px">${bars}</div>
        <br>
        <table style="width:100%;border-collapse:collapse;font-size:9px"><thead>
          <tr style="background:#333;color:white">
            <th style="padding:3px 5px;text-align:left">Score %</th><th style="padding:3px 5px">Grade</th>
            <th style="padding:3px 5px">Description</th><th style="padding:3px 5px">Colour</th>
          </tr></thead><tbody>${gradeKeyRows}</tbody></table>
        <div style="font-size:8px;margin-top:4px;color:#555">N.B: PTE means PROGRESSING TOWARDS EXPECTATION and NME means NOT MEETING EXPECTATION</div>
      </td></tr></table>
    ${sharedComments}`;

    const html = `<!DOCTYPE html><html><head><title>${studentName} — ${reportHeader}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:12px}
    @media print{body{padding:0}@page{margin:6mm;size:A4}}table{border-collapse:collapse}</style>
    </head><body>${htmlBody}</body></html>`;

    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  // Auto-trigger download once data + DOM are ready (used by parent download button)
  useEffect(() => {
    if (autoPrint && data && !autoPrinted.current) {
      autoPrinted.current = true;
      setTimeout(handleDownload, 600);
    }
  }, [autoPrint, data]);

  if (isLoading) return (
    <div className={inline ? "flex items-center justify-center py-20" : "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"}>
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (!data) return null;

  const { student, term, results, subjectStats, headTeacherComment, headOfSchoolComment, headTeacherName, headTeacherSignatureUrl, headOfSchoolSignatureUrl, isCommentMode, daysOpen, daysPresent, nextTermBegins, yearTerms, termOrder, prevTermResults } = data;
  const isEndOfTerm = resultType === "end_of_term";
  const scoredResults = results.filter((r: any) => !r.did_not_participate);
  const hasNewFormat = isEndOfTerm && scoredResults.some((r: any) => r.portfolio_score != null);
  const outOfPreview = isEndOfTerm ? (hasNewFormat ? 100 : 70) : 30;
  const totalObtainable = scoredResults.length * outOfPreview;
  const totalObtained = scoredResults.reduce((s: number, r: any) => s + Number(r.total_score || 0), 0);
  const totalPct = totalObtainable > 0 ? (totalObtained / totalObtainable) * 100 : 0;
  const overallGrade = getGradeInfo(totalPct);
  const average = scoredResults.length > 0 ? totalObtained / scoredResults.length : 0;
  const studentName = student.full_name || `${student.first_name || ""} ${student.last_name || ""}`.trim();
  const reportLabel = resultType === "mid_term" ? "Mid Term" : "End of Term";
  // Build per-subject previous term lookup for cumulative display
  const prevBySubjectPreview: Record<string, number[]> = {};
  (prevTermResults || []).forEach((pr: any) => {
    const idx = (yearTerms || []).findIndex((t: any) => t.id === pr.term_id);
    if (idx < 0) return;
    if (!prevBySubjectPreview[pr.subject_id]) prevBySubjectPreview[pr.subject_id] = [];
    prevBySubjectPreview[pr.subject_id][idx] = Number(pr.total_score || 0);
  });
  const termNamesPreview = (yearTerms || []).map((t: any) => t.name);
  const t1LabelPreview = termNamesPreview[0] ? `${termNamesPreview[0]}` : "1st Term";
  const t2LabelPreview = termNamesPreview[1] ? `${termNamesPreview[1]}` : "2nd Term";
  const dob = student.date_of_birth;
  const age = dob ? `${new Date().getFullYear() - new Date(dob).getFullYear()} yrs` : "—";

  const cardContent = (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
        <div>
          <p className="font-semibold text-gray-800">{studentName}</p>
          <p className="text-xs text-gray-500">{(term as any)?.name} · {reportLabel} Report Card · {(term as any)?.academic_year}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownload} disabled={downloading} className="hero-gradient gap-2 text-sm">
            <Download size={15} /> {downloading ? "Saving…" : "Download PDF"}
          </Button>
          <Button onClick={handlePrint} variant="outline" size="icon" title="Print"><Printer size={15} /></Button>
          {!inline && onClose && <Button variant="outline" size="icon" onClick={onClose}><X size={16} /></Button>}
        </div>
      </div>

        {/* Report card preview — styled to match PDF */}
        <div ref={contentRef} className="p-5 space-y-0 text-[11px] font-sans text-gray-900" style={{ fontFamily: "Arial, sans-serif" }}>

          {/* School header */}
          <div className="border-2 border-gray-800">
            <div className="flex">
              <div className="border-r border-gray-800 p-2 flex items-center justify-center w-20 row-span-2">
                <img src={schoolLogo} alt="Logo" className="h-12 w-auto" />
              </div>
              <div className="flex-1">
                <div className="border-b border-gray-800 text-center py-2 px-4">
                  <div className="text-xl font-bold tracking-widest">I T A I N - B E L L &nbsp; S C H O O L S</div>
                  <div className="text-[9px] text-gray-500 mt-0.5">7, Mustapha Street, Off Olanrewaju or Olayiwola Street, Oregun, Ikeja, Lagos.</div>
                </div>
                <div className="text-center py-2 px-4 bg-blue-100 font-bold text-[11px]">
                  {(term as any)?.name?.toUpperCase()} {reportLabel.toUpperCase()} REPORT SHEET — {(term as any)?.academic_year} SESSION
                </div>
              </div>
            </div>
          </div>

          {/* Student info */}
          <div className="border-2 border-gray-800 border-t-0">
            <div className="flex">
              <div className="border-r border-gray-800 p-2 flex items-center justify-center w-20 flex-shrink-0">
                {student.avatar_url
                  ? <img src={student.avatar_url} className="w-16 h-20 object-cover" />
                  : <div className="w-16 h-20 bg-gray-100 flex items-center justify-center text-[8px] text-gray-400">No Photo</div>
                }
              </div>
              {isCommentMode ? (
                <div className="flex-1 grid grid-cols-2">
                  {[
                    ["Name:", studentName],
                    ["Sex:", student.gender?.toUpperCase() || "—"],
                    ["Class:", student.className],
                    ["Age:", age],
                  ].map(([l, v], i) => (
                    <div key={i} className="contents">
                      <div className="border-b border-r border-gray-400 px-2 py-1.5 font-semibold">{l}</div>
                      <div className="border-b border-gray-400 px-2 py-1.5">{v}</div>
                    </div>
                  ))}
                </div>
              ) : isEndOfTerm ? (
                <div className="flex-1 grid grid-cols-4">
                  {[
                    ["Name:", studentName, "Score Obtainable:", totalObtainable],
                    ["Sex:", student.gender?.toUpperCase() || "—", "Score Obtained:", totalObtained],
                    ["Class:", student.className, "Term Percentage:", `${totalPct.toFixed(1)}%`],
                    ["Age:", age, "Term Grade:", null],
                  ].map(([l1, v1, l2, v2], i) => (
                    <div key={i} className="contents">
                      <div className="border-b border-r border-gray-400 px-2 py-1.5 font-semibold">{l1}</div>
                      <div className="border-b border-r border-gray-400 px-2 py-1.5">{v1}</div>
                      <div className="border-b border-r border-gray-400 px-2 py-1.5 font-semibold">{l2}</div>
                      <div className="border-b border-gray-400 px-2 py-1.5">
                        {(l2 as string).includes("Grade")
                          ? <span className="font-bold" style={{ color: overallGrade.color }}>{overallGrade.letter} — {overallGrade.remark}</span>
                          : <span className="italic">{v2}</span>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 grid grid-cols-4">
                  {[
                    ["Name:", studentName, "Mid Term Score Obtainable:", totalObtainable],
                    ["Sex:", student.gender?.toUpperCase() || "—", "Mid Term Score Obtained:", totalObtained],
                    ["Class:", student.className, "Mid Term Average:", average.toFixed(2)],
                    ["Age:", age, "Mid Term Grade:", null],
                  ].map(([l1, v1, l2, v2], i) => (
                    <div key={i} className="contents">
                      <div className="border-b border-r border-gray-400 px-2 py-1.5 font-semibold">{l1}</div>
                      <div className="border-b border-r border-gray-400 px-2 py-1.5">{v1}</div>
                      <div className="border-b border-r border-gray-400 px-2 py-1.5 font-semibold">{l2}</div>
                      <div className="border-b border-gray-400 px-2 py-1.5">
                        {(l2 as string).includes("Grade")
                          ? <span className="font-bold" style={{ color: overallGrade.color }}>{overallGrade.letter}</span>
                          : <span className="italic">{v2}</span>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section header */}
          <div className="border-2 border-gray-800 border-t-0 text-center py-1.5 font-bold bg-gray-100">
            ACADEMICS (COGNITIVE DOMAIN)
          </div>

          {isCommentMode ? (
            /* Comment mode: subject comments + attendance */
            <div className="border-2 border-gray-800 border-t-0 flex">
              <div className="flex-[3] border-r border-gray-800 overflow-x-auto">
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-blue-100">
                      <th className="text-left px-2 py-1.5 border-b border-gray-400 font-semibold w-[40%]">SUBJECTS</th>
                      <th className="text-left px-2 py-1.5 border-b border-l border-gray-400 font-semibold">COMMENTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r: any, i: number) => (
                      <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-2 py-1 border-b border-gray-200">{r.subjectName}</td>
                        <td className="px-2 py-1 border-b border-l border-gray-200">{r.teacher_comments || ""}</td>
                      </tr>
                    ))}
                    {!results.length && (
                      <tr><td colSpan={2} className="px-4 py-6 text-center text-gray-400">No results for this report type.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex-[2] p-3 text-[10px]">
                <table className="w-full border-collapse">
                  <tbody>
                    {[
                      ["Days School Open:", daysOpen ?? "—"],
                      ["Days Present:", daysPresent ?? "—"],
                      ["Days Absent:", daysOpen != null && daysPresent != null ? daysOpen - daysPresent : "—"],
                      ["Next Term Begins:", nextTermBegins ?? "—"],
                    ].map(([l, v]) => (
                      <tr key={String(l)} className="border-b border-gray-200">
                        <td className="py-1.5 font-semibold pr-2">{l}</td>
                        <td className="py-1.5 text-right">{String(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : isEndOfTerm ? (
          /* End of Term: full-width subject table + summary row */
          <>
            <div className="border-2 border-gray-800 border-t-0 overflow-x-auto">
              <table className="w-full border-collapse text-[9px]">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="text-left px-2 py-1 border-b border-gray-400 font-semibold min-w-[120px]">SUBJECTS</th>
                    <th className="text-center px-1 py-1 border-b border-l border-gray-400 font-semibold">Portfolio<br/>&amp; Project<br/>(10)</th>
                    <th className="text-center px-1 py-1 border-b border-l border-gray-400 font-semibold">Test<br/>Score<br/>(30)</th>
                    <th className="text-center px-1 py-1 border-b border-l border-gray-400 font-semibold">Exam<br/>Score<br/>(60)</th>
                    <th className="text-center px-1 py-1 border-b border-l border-gray-400 font-semibold">Total<br/>(100)</th>
                    <th className="text-center px-1 py-1 border-b border-l border-gray-400 font-semibold">Grade</th>
                    <th className="text-center px-1 py-1 border-b border-l border-gray-400 font-semibold">Remark</th>
                    <th className="text-center px-1 py-1 border-b border-l border-gray-400 font-semibold">Highest<br/>in Class</th>
                    <th className="text-center px-1 py-1 border-b border-l border-gray-400 font-semibold">Lowest<br/>in Class</th>
                    <th className="text-center px-1 py-1 border-b border-l border-gray-400 font-semibold">{t1LabelPreview}<br/>(100)</th>
                    <th className="text-center px-1 py-1 border-b border-l border-gray-400 font-semibold">{t2LabelPreview}<br/>(100)</th>
                    <th className="text-center px-1 py-1 border-b border-l border-gray-400 font-semibold">Cumul.<br/>(300)</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r: any, i: number) => {
                    if (r.did_not_participate) {
                      return (
                        <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-2 py-1 border-b border-gray-200">{r.subjectName}</td>
                          <td colSpan={11} className="px-1 py-1 border-b border-l border-gray-200 text-center text-gray-400 italic">Did not take part</td>
                        </tr>
                      );
                    }
                    const total = Number(r.total_score || 0);
                    const pct = hasNewFormat ? total : (total / 70) * 100;
                    const g = getGradeInfo(pct);
                    const stats = subjectStats[r.subject_id];
                    const portfolio = r.portfolio_score != null ? Number(r.portfolio_score) : "—";
                    const exam = r.exam_score != null ? Number(r.exam_score) : "—";
                    const test = (r.portfolio_score != null && r.exam_score != null)
                      ? Math.max(0, total - Number(r.portfolio_score) - Number(r.exam_score)) : "—";
                    const prevScores = prevBySubjectPreview[r.subject_id] || [];
                    const term1 = prevScores[0] != null ? prevScores[0] : "—";
                    const term2 = prevScores[1] != null ? prevScores[1] : "—";
                    const cumulative = [term1, term2, total].every(v => v !== "—")
                      ? Number(term1) + Number(term2) + total : "—";
                    return (
                      <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-2 py-1 border-b border-gray-200">{r.subjectName}</td>
                        <td className="px-1 py-1 border-b border-l border-gray-200 text-center">{String(portfolio)}</td>
                        <td className="px-1 py-1 border-b border-l border-gray-200 text-center">{String(test)}</td>
                        <td className="px-1 py-1 border-b border-l border-gray-200 text-center">{String(exam)}</td>
                        <td className="px-1 py-1 border-b border-l border-gray-200 text-center font-bold">{total}</td>
                        <td className="px-1 py-1 border-b border-l border-gray-200 text-center font-bold" style={{ color: g.color }}>{g.letter}</td>
                        <td className="px-1 py-1 border-b border-l border-gray-200 font-semibold" style={{ color: g.color }}>{g.remark}</td>
                        <td className="px-1 py-1 border-b border-l border-gray-200 text-center">{stats?.highest ?? "—"}</td>
                        <td className="px-1 py-1 border-b border-l border-gray-200 text-center">{stats?.lowest ?? "—"}</td>
                        <td className="px-1 py-1 border-b border-l border-gray-200 text-center">{String(term1)}</td>
                        <td className="px-1 py-1 border-b border-l border-gray-200 text-center">{String(term2)}</td>
                        <td className="px-1 py-1 border-b border-l border-gray-200 text-center font-bold">{String(cumulative)}</td>
                      </tr>
                    );
                  })}
                  {!results.length && (
                    <tr><td colSpan={12} className="px-4 py-6 text-center text-gray-400">No results for this report type.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Attendance + Grade legend */}
            <div className="border-2 border-gray-800 border-t-0 flex">
              <div className="flex-1 border-r border-gray-800 p-3">
                <p className="text-[9px] font-bold mb-1.5 text-gray-700">Attendance</p>
                <table className="w-full border-collapse text-[9px]">
                  {[
                    ["Days School Open:", daysOpen ?? "—"],
                    ["Days Present:", daysPresent ?? "—"],
                    ["Days Absent:", daysOpen != null && daysPresent != null ? daysOpen - daysPresent : "—"],
                    ["Christmas Term Begins:", nextTermBegins ?? "—"],
                  ].map(([l, v]) => (
                    <tr key={String(l)} className="border-b border-gray-200">
                      <td className="py-1 font-semibold pr-2">{l}</td>
                      <td className="py-1 text-right">{String(v)}</td>
                    </tr>
                  ))}
                </table>
              </div>
              <div className="flex-1 p-3">
                <p className="text-[9px] font-bold mb-1.5 text-gray-700">Cognitive Domain Rating</p>
                <table className="w-full border-collapse text-[8px]">
                  <thead><tr className="bg-gray-800 text-white">
                    <th className="px-1 py-0.5 text-left">Score %</th>
                    <th className="px-1 py-0.5">Grade</th>
                    <th className="px-1 py-0.5">Description</th>
                    <th className="px-1 py-0.5">Colour</th>
                  </tr></thead>
                  <tbody>
                    {GRADE_SCALE.map((g) => (
                      <tr key={g.letter}>
                        <td className="border border-gray-300 px-1 py-0.5">{g.range}</td>
                        <td className="border border-gray-300 px-1 py-0.5 text-center font-bold" style={{ color: g.color }}>{g.letter}</td>
                        <td className="border border-gray-300 px-1 py-0.5">{g.remark}</td>
                        <td className="border border-gray-300 px-1 py-0.5 text-center" style={{ background: g.color }}>&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[7px] text-gray-500 mt-1 leading-tight">PTE = PROGRESSING TOWARDS EXPECTATION &nbsp;|&nbsp; NME = NOT MEETING EXPECTATION</p>
              </div>
            </div>
          </>
          ) : (
          /* Mid Term: results table + chart side by side */
          <div className="border-2 border-gray-800 border-t-0 flex">
            {/* Subjects table */}
            <div className="flex-1 border-r border-gray-800 overflow-x-auto">
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="text-left px-2 py-1.5 border-b border-gray-400 font-semibold">SUBJECTS</th>
                    <th className="text-center px-1 py-1.5 border-b border-l border-gray-400 font-semibold">Mid Term<br />Total (30)</th>
                    <th className="text-center px-1 py-1.5 border-b border-l border-gray-400 font-semibold">Grade</th>
                    <th className="text-center px-1 py-1.5 border-b border-l border-gray-400 font-semibold">Remark</th>
                    <th className="text-center px-1 py-1.5 border-b border-l border-gray-400 font-semibold">Highest Score<br />in Class</th>
                    <th className="text-center px-1 py-1.5 border-b border-l border-gray-400 font-semibold">Lowest Score<br />in Class</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r: any, i: number) => {
                    if (r.did_not_participate) {
                      return (
                        <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-2 py-1 border-b border-gray-200">{r.subjectName}</td>
                          <td colSpan={5} className="px-1 py-1 border-b border-l border-gray-200 text-center text-gray-400 italic text-[9px]">Did not take part</td>
                        </tr>
                      );
                    }
                    const score = Number(r.total_score || 0);
                    const g = getGradeInfo((score / 30) * 100);
                    const stats = subjectStats[r.subject_id];
                    return (
                      <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-2 py-1 border-b border-gray-200">{r.subjectName}</td>
                        <td className="px-1 py-1 border-b border-l border-gray-200 text-center">{score}</td>
                        <td className="px-1 py-1 border-b border-l border-gray-200 text-center font-bold" style={{ color: g.color }}>{g.letter}</td>
                        <td className="px-1 py-1 border-b border-l border-gray-200 font-semibold" style={{ color: g.color }}>{g.remark}</td>
                        <td className="px-1 py-1 border-b border-l border-gray-200 text-center">{stats?.highest ?? "—"}</td>
                        <td className="px-1 py-1 border-b border-l border-gray-200 text-center">{stats?.lowest ?? "—"}</td>
                      </tr>
                    );
                  })}
                  {!results.length && (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No results for this report type.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Chart + grade key */}
            <div className="w-44 p-3 flex flex-col gap-3">
              <div>
                <p className="text-[9px] font-bold text-center mb-1">Mid Term Total (30)</p>
                <div className="flex items-end gap-px border-l border-b border-gray-400 h-16 px-0.5">
                  {scoredResults.map((r: any) => {
                    const score = Number(r.total_score || 0);
                    const g = getGradeInfo((score / 30) * 100);
                    const h = Math.max(2, Math.round((score / 30) * 56));
                    return (
                      <div key={r.id} className="flex flex-col items-center flex-1 min-w-0">
                        <span className="text-[5px] leading-none mb-px">{score}</span>
                        <div className="w-full min-h-[2px]" style={{ height: h, backgroundColor: g.color }} />
                        <span className="text-[5px] mt-px overflow-hidden whitespace-nowrap text-center w-full">{r.subjectName.substring(0, 5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <table className="w-full border-collapse text-[8px]">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="px-1 py-0.5 text-left">Score %</th>
                    <th className="px-1 py-0.5">Grade</th>
                    <th className="px-1 py-0.5">Description</th>
                    <th className="px-1 py-0.5">Colour</th>
                  </tr>
                </thead>
                <tbody>
                  {GRADE_SCALE.map((g) => (
                    <tr key={g.letter}>
                      <td className="border border-gray-300 px-1 py-0.5">{g.range}</td>
                      <td className="border border-gray-300 px-1 py-0.5 text-center font-bold" style={{ color: g.color }}>{g.letter}</td>
                      <td className="border border-gray-300 px-1 py-0.5">{g.remark}</td>
                      <td className="border border-gray-300 px-1 py-0.5 text-center" style={{ background: g.color }}>&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[7px] text-gray-500 leading-tight">N.B: PTE means PROGRESSING TOWARDS EXPECTATION and NME means NOT MEETING EXPECTATION</p>
            </div>
          </div>
          )}

          {/* Head teacher comment */}
          <div className="border-2 border-gray-800 border-t-0">
            <div className="bg-gray-100 px-2 py-1 font-bold border-b border-gray-400">Class Teacher Comments</div>
            <div className="grid grid-cols-3 divide-x divide-gray-400">
              <div className="col-span-1 px-2 py-2 min-h-[32px]">{headTeacherComment || <span className="text-gray-400 italic">Pending</span>}</div>
              <div className="px-2 py-2">Date: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
              <div className="px-2 py-2 flex items-center gap-1">
                Signature:
                {headTeacherSignatureUrl
                  ? <img src={headTeacherSignatureUrl} alt="HT signature" className="h-7 max-w-[80px] object-contain ml-1" />
                  : <span className="text-gray-300 ml-1">___________</span>}
              </div>
            </div>
            <div className="px-2 py-1.5 border-t border-gray-400">
              <span className="font-semibold">Class Teacher:</span> {headTeacherName || "—"}
            </div>
          </div>

          {/* Head of School comment */}
          <div className="border-2 border-gray-800 border-t-0">
            <div className="bg-gray-100 px-2 py-1 font-bold border-b border-gray-400">Head of School Comments</div>
            <div className="grid grid-cols-3 divide-x divide-gray-400">
              <div className="col-span-1 px-2 py-2 min-h-[32px]">{headOfSchoolComment || <span className="text-gray-400 italic">Pending</span>}</div>
              <div className="px-2 py-2">Date: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
              <div className="px-2 py-2 flex items-center gap-1">
                Signature:
                {headOfSchoolSignatureUrl
                  ? <img src={headOfSchoolSignatureUrl} alt="HoS signature" className="h-7 max-w-[80px] object-contain ml-1" />
                  : <span className="text-gray-300 ml-1">___________</span>}
              </div>
            </div>
            <div className="px-2 py-1.5 border-t border-gray-400">
              <span className="font-semibold">Acting Head of School:</span> Mrs Goodness Duru
            </div>
          </div>

        </div>
    </>
  );

  if (inline) {
    return <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">{cardContent}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden">{cardContent}</div>
    </div>
  );
};

export default ReportCard;
