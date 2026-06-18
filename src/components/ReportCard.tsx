import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";

interface ReportCardProps {
  studentId: string;
  termId: string;
  resultType: "mid_term" | "end_of_term";
  onClose?: () => void;
  inline?: boolean;
}

const GRADE_SCALE = [
  { min: 28.5, max: 30,    letter: "A+", remark: "Outstanding", color: "#7B2D8B", range: "28.5 – 30"   },
  { min: 27.0, max: 28.49, letter: "A",  remark: "Outstanding", color: "#4a0e6e", range: "27.0 – 28.4" },
  { min: 25.5, max: 26.99, letter: "B+", remark: "Proficient",  color: "#166534", range: "25.5 – 26.9" },
  { min: 24.0, max: 25.49, letter: "B",  remark: "Proficient",  color: "#166534", range: "24.0 – 25.4" },
  { min: 22.5, max: 23.99, letter: "C+", remark: "Capable",     color: "#1e40af", range: "22.5 – 23.9" },
  { min: 21.0, max: 22.49, letter: "C",  remark: "Capable",     color: "#1e40af", range: "21.0 – 22.4" },
  { min: 18.0, max: 20.99, letter: "D",  remark: "PTE",         color: "#c2410c", range: "18.0 – 20.9" },
  { min: 0,    max: 17.99, letter: "E",  remark: "NME",         color: "#b91c1c", range: "< 18"        },
];

const getGradeInfo = (score: number) =>
  GRADE_SCALE.find((g) => score >= g.min && score <= g.max) || GRADE_SCALE[GRADE_SCALE.length - 1];

const ReportCard = ({ studentId, termId, resultType, onClose, inline }: ReportCardProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ["report-card", studentId, termId, resultType],
    queryFn: async () => {
      const [studentRes, termRes, resultsRes, submissionRes] = await Promise.all([
        supabase.from("students").select("*").eq("id", studentId).single(),
        supabase.from("terms").select("*").eq("id", termId).single(),
        supabase.from("results").select("*").eq("student_id", studentId).eq("term_id", termId).eq("result_type", resultType),
        supabase.from("report_submissions").select("head_teacher_comment, head_of_school_comment, approved_by").eq("student_id", studentId).eq("term_id", termId).eq("result_type", resultType).maybeSingle(),
      ]);
      if (studentRes.error) throw studentRes.error;

      // Get class name and head teacher (flat queries — no FK joins)
      let className = "—";
      let headTeacherName = "";
      let headTeacherSignatureUrl = "";
      let headOfSchoolSignatureUrl = "";
      if (studentRes.data?.class_id) {
        const { data: cls } = await supabase.from("classes").select("name, head_teacher_id").eq("id", studentRes.data.class_id).single();
        className = cls?.name || "—";
        if (cls?.head_teacher_id) {
          const { data: headProfile } = await supabase.from("profiles").select("full_name, signature_url").eq("user_id", cls.head_teacher_id).maybeSingle();
          headTeacherName = headProfile?.full_name || "";
          headTeacherSignatureUrl = headProfile?.signature_url || "";
        }
      }

      // Get head of school signature — fetch from the super admin who has uploaded one
      const { data: hosProfile } = await supabase.from("profiles").select("signature_url").eq("is_super_admin", true).not("signature_url", "is", null).maybeSingle();
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
        const score = Number(r.total_score);
        if (!subjectStats[r.subject_id]) subjectStats[r.subject_id] = { highest: score, lowest: score };
        else {
          subjectStats[r.subject_id].highest = Math.max(subjectStats[r.subject_id].highest, score);
          subjectStats[r.subject_id].lowest = Math.min(subjectStats[r.subject_id].lowest, score);
        }
      });

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
      };
    },
  });

  const handlePrint = () => {
    if (!data) return;
    const { student, term, results, subjectStats, headTeacherComment, headOfSchoolComment, headTeacherName, headTeacherSignatureUrl, headOfSchoolSignatureUrl } = data;
    const totalObtainable = results.length * 30;
    const totalObtained = results.reduce((s: number, r: any) => s + Number(r.total_score || 0), 0);
    const average = results.length > 0 ? totalObtained / results.length : 0;
    const overallGrade = getGradeInfo(average);
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

    const subjectRows = results.map((r: any, i: number) => {
      const score = Number(r.total_score || 0);
      const g = getGradeInfo(score);
      const stats = subjectStats[r.subject_id];
      const bg = i % 2 === 0 ? "#fff" : "#f8f9fa";
      return `<tr style="background:${bg}">
        <td style="padding:5px 8px;border-bottom:1px solid #ddd">${r.subjectName}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #ddd;text-align:center">${score}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #ddd;text-align:center;font-weight:bold;color:${g.color}">${g.letter}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #ddd;font-weight:bold;color:${g.color}">${g.remark}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #ddd;text-align:center">${stats?.highest ?? "—"}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #ddd;text-align:center">${stats?.lowest ?? "—"}</td>
      </tr>`;
    }).join("");

    const bars = results.map((r: any) => {
      const score = Number(r.total_score || 0);
      const g = getGradeInfo(score);
      const h = Math.max(2, Math.round((score / 30) * 70));
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

    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    const html = `<!DOCTYPE html><html><head><title>${studentName} — ${reportHeader}</title>
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
      <td style="border:1px solid #333;padding:4px;text-align:center;width:75px;vertical-align:middle" rowspan="4">
        ${photoUrl ? `<img src="${photoUrl}" style="width:65px;height:80px;object-fit:cover">` : `<div style="width:65px;height:80px;background:#eee;display:flex;align-items:center;justify-content:center;font-size:8px;color:#999">No Photo</div>`}
      </td>
      <td style="border:1px solid #333;padding:4px 8px;width:22%"><strong>Name:</strong></td>
      <td style="border:1px solid #333;padding:4px 8px;width:28%"><strong>${studentName}</strong></td>
      <td style="border:1px solid #333;padding:4px 8px;width:25%"><strong>${scoreLabel} Score Obtainable:</strong></td>
      <td style="border:1px solid #333;padding:4px 8px;font-style:italic">${totalObtainable}</td></tr><tr>
      <td style="border:1px solid #333;padding:4px 8px"><strong>Sex:</strong></td>
      <td style="border:1px solid #333;padding:4px 8px">${gender}</td>
      <td style="border:1px solid #333;padding:4px 8px"><strong>${scoreLabel} Score Obtained:</strong></td>
      <td style="border:1px solid #333;padding:4px 8px;font-style:italic">${totalObtained}</td></tr><tr>
      <td style="border:1px solid #333;padding:4px 8px"><strong>Class:</strong></td>
      <td style="border:1px solid #333;padding:4px 8px">${student.className}</td>
      <td style="border:1px solid #333;padding:4px 8px"><strong>${scoreLabel} Average:</strong></td>
      <td style="border:1px solid #333;padding:4px 8px;font-style:italic">${average.toFixed(2)}</td></tr><tr>
      <td style="border:1px solid #333;padding:4px 8px"><strong>Age:</strong></td>
      <td style="border:1px solid #333;padding:4px 8px">${age}</td>
      <td style="border:1px solid #333;padding:4px 8px"><strong>${scoreLabel} Grade:</strong></td>
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
            <th style="padding:5px 4px;border-bottom:1px solid #333;text-align:center">${scoreLabel}<br>Total (30)</th>
            <th style="padding:5px 4px;border-bottom:1px solid #333;text-align:center">Grade</th>
            <th style="padding:5px 4px;border-bottom:1px solid #333;text-align:center">Remark</th>
            <th style="padding:5px 4px;border-bottom:1px solid #333;text-align:center">Highest Score<br>in Class</th>
            <th style="padding:5px 4px;border-bottom:1px solid #333;text-align:center">Lowest Score<br>in Class</th>
          </tr></thead><tbody>${subjectRows}</tbody></table>
      </td>
      <td style="border:1px solid #333;padding:8px;vertical-align:top;width:42%">
        <div style="font-size:9px;font-weight:bold;text-align:center;margin-bottom:4px">${scoreLabel} Total (30)</div>
        <div style="display:flex;align-items:flex-end;height:75px;gap:1px;border-left:1px solid #999;border-bottom:1px solid #999;padding:0 2px">${bars}</div>
        <br>
        <table style="width:100%;border-collapse:collapse;font-size:9px"><thead>
          <tr style="background:#333;color:white">
            <th style="padding:3px 5px;text-align:left">Score</th><th style="padding:3px 5px">Grade</th>
            <th style="padding:3px 5px">Description</th><th style="padding:3px 5px">Colour</th>
          </tr></thead><tbody>${gradeKeyRows}</tbody></table>
        <div style="font-size:8px;margin-top:4px;color:#555">N.B: PTE means PROGRESSING TOWARDS EXPECTATION and NME means NOT MEETING EXPECTATION</div>
      </td></tr></table>
    <table style="width:100%;border:2px solid #333;border-top:0;margin-bottom:0"><tr>
      <td colspan="3" style="border:1px solid #333;padding:2px 8px;background:#ebebeb;font-weight:bold;font-size:10px">Head Teacher Comments</td></tr><tr>
      <td style="border:1px solid #333;padding:5px 8px;width:50%;font-size:10px">${headTeacherComment}</td>
      <td style="border:1px solid #333;padding:5px 8px;font-size:10px">Date: ${today}</td>
      <td style="border:1px solid #333;padding:5px 8px;font-size:10px">${headTeacherSignatureUrl ? `<img src="${headTeacherSignatureUrl}" style="height:28px;max-width:90px;object-fit:contain" alt="signature" />` : "Signature: ___________"}</td></tr><tr>
      <td colspan="3" style="border:1px solid #333;padding:5px 8px;font-size:10px"><strong>Head Teacher:</strong> ${headTeacherName || "—"}</td></tr></table>
    <table style="width:100%;border:2px solid #333;border-top:0"><tr>
      <td colspan="3" style="border:1px solid #333;padding:2px 8px;background:#ebebeb;font-weight:bold;font-size:10px">Head of School Comments</td></tr><tr>
      <td style="border:1px solid #333;padding:5px 8px;width:50%;font-size:10px">${headOfSchoolComment}</td>
      <td style="border:1px solid #333;padding:5px 8px;font-size:10px">Date: ${today}</td>
      <td style="border:1px solid #333;padding:5px 8px;font-size:10px">${headOfSchoolSignatureUrl ? `<img src="${headOfSchoolSignatureUrl}" style="height:28px;max-width:90px;object-fit:contain" alt="signature" />` : "Signature: ___________"}</td></tr><tr>
      <td colspan="3" style="border:1px solid #333;padding:5px 8px;font-size:10px"><strong>Acting Head of School:</strong> Mrs Goodness Duru</td></tr></table>
    </body></html>`;

    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  if (isLoading) return (
    <div className={inline ? "flex items-center justify-center py-20" : "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"}>
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (!data) return null;

  const { student, term, results, subjectStats, headTeacherComment, headOfSchoolComment, headTeacherName, headTeacherSignatureUrl, headOfSchoolSignatureUrl } = data;
  const totalObtainable = results.length * 30;
  const totalObtained = results.reduce((s: number, r: any) => s + Number(r.total_score || 0), 0);
  const average = results.length > 0 ? totalObtained / results.length : 0;
  const overallGrade = getGradeInfo(average);
  const studentName = student.full_name || `${student.first_name || ""} ${student.last_name || ""}`.trim();
  const reportLabel = resultType === "mid_term" ? "Mid Term" : "End of Term";
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
          <Button onClick={handlePrint} className="hero-gradient gap-2 text-sm">
            <Printer size={15} /> Print / Download PDF
          </Button>
          {!inline && onClose && <Button variant="outline" size="icon" onClick={onClose}><X size={16} /></Button>}
        </div>
      </div>

        {/* Report card preview — styled to match PDF */}
        <div className="p-5 space-y-0 text-[11px] font-sans text-gray-900" style={{ fontFamily: "Arial, sans-serif" }}>

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
              <div className="flex-1 grid grid-cols-4">
                {[
                  ["Name:", studentName, `${reportLabel} Score Obtainable:`, totalObtainable],
                  ["Sex:", student.gender?.toUpperCase() || "—", `${reportLabel} Score Obtained:`, totalObtained],
                  ["Class:", student.className, `${reportLabel} Average:`, average.toFixed(2)],
                  ["Age:", age, `${reportLabel} Grade:`, null],
                ].map(([l1, v1, l2, v2], i) => (
                  <div key={i} className="contents">
                    <div className="border-b border-r border-gray-400 px-2 py-1.5 font-semibold">{l1}</div>
                    <div className="border-b border-r border-gray-400 px-2 py-1.5">{v1}</div>
                    <div className="border-b border-r border-gray-400 px-2 py-1.5 font-semibold">{l2}</div>
                    <div className="border-b border-gray-400 px-2 py-1.5">
                      {l2.includes("Grade")
                        ? <span className="font-bold" style={{ color: overallGrade.color }}>{overallGrade.letter}</span>
                        : <span className="italic">{v2}</span>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section header */}
          <div className="border-2 border-gray-800 border-t-0 text-center py-1.5 font-bold bg-gray-100">
            ACADEMICS (COGNITIVE DOMAIN)
          </div>

          {/* Results table + chart side by side */}
          <div className="border-2 border-gray-800 border-t-0 flex">
            {/* Subjects table */}
            <div className="flex-1 border-r border-gray-800 overflow-x-auto">
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="text-left px-2 py-1.5 border-b border-gray-400 font-semibold">SUBJECTS</th>
                    <th className="text-center px-1 py-1.5 border-b border-l border-gray-400 font-semibold">{reportLabel}<br />Total (30)</th>
                    <th className="text-center px-1 py-1.5 border-b border-l border-gray-400 font-semibold">Grade</th>
                    <th className="text-center px-1 py-1.5 border-b border-l border-gray-400 font-semibold">Remark</th>
                    <th className="text-center px-1 py-1.5 border-b border-l border-gray-400 font-semibold">Highest Score<br />in Class</th>
                    <th className="text-center px-1 py-1.5 border-b border-l border-gray-400 font-semibold">Lowest Score<br />in Class</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r: any, i: number) => {
                    const score = Number(r.total_score || 0);
                    const g = getGradeInfo(score);
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
                <p className="text-[9px] font-bold text-center mb-1">{reportLabel} Total (30)</p>
                <div className="flex items-end gap-px border-l border-b border-gray-400 h-16 px-0.5">
                  {results.map((r: any) => {
                    const score = Number(r.total_score || 0);
                    const g = getGradeInfo(score);
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
                    <th className="px-1 py-0.5 text-left">Score</th>
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

          {/* Head teacher comment */}
          <div className="border-2 border-gray-800 border-t-0">
            <div className="bg-gray-100 px-2 py-1 font-bold border-b border-gray-400">Head Teacher Comments</div>
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
              <span className="font-semibold">Head Teacher:</span> {headTeacherName || "—"}
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
