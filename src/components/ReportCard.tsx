import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";

interface ReportCardProps {
  studentId: string;
  termId: string;
  resultType: "mid_term" | "end_of_term";
  onClose: () => void;
}

const GRADE_SCALE = [
  { min: 28.5, max: 30,    letter: "A+", remark: "Outstanding", color: "#7B2D8B" },
  { min: 27.0, max: 28.49, letter: "A",  remark: "Outstanding", color: "#4a0e6e" },
  { min: 25.5, max: 26.99, letter: "B+", remark: "Proficient",  color: "#166534" },
  { min: 24.0, max: 25.49, letter: "B",  remark: "Proficient",  color: "#166534" },
  { min: 22.5, max: 23.99, letter: "C+", remark: "Capable",     color: "#1e40af" },
  { min: 21.0, max: 22.49, letter: "C",  remark: "Capable",     color: "#1e40af" },
  { min: 18.0, max: 20.99, letter: "D",  remark: "PTE",         color: "#c2410c" },
  { min: 0,   max: 17.99, letter: "E",  remark: "NME",         color: "#b91c1c" },
];

const getGradeInfo = (score: number) =>
  GRADE_SCALE.find((g) => score >= g.min && score <= g.max) || GRADE_SCALE[GRADE_SCALE.length - 1];

const ReportCard = ({ studentId, termId, resultType, onClose }: ReportCardProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ["report-card", studentId, termId, resultType],
    queryFn: async () => {
      const [studentRes, termRes, resultsRes] = await Promise.all([
        supabase.from("students").select("*, classes:class_id(name)").eq("id", studentId).single(),
        supabase.from("terms").select("*").eq("id", termId).single(),
        supabase
          .from("results")
          .select("*, subjects:subject_id(name)")
          .eq("student_id", studentId)
          .eq("term_id", termId)
          .eq("result_type", resultType),
      ]);
      if (studentRes.error) throw studentRes.error;
      if (termRes.error) throw termRes.error;

      const classId = studentRes.data?.class_id;

      // Get all students in same class to compute highest/lowest per subject
      const { data: classStudents } = await supabase
        .from("students")
        .select("id")
        .eq("class_id", classId);

      const classStudentIds = classStudents?.map((s: any) => s.id) || [];

      const { data: classResults } = await supabase
        .from("results")
        .select("subject_id, total_score")
        .eq("term_id", termId)
        .eq("result_type", resultType)
        .in("student_id", classStudentIds);

      const subjectStats: Record<string, { highest: number; lowest: number }> = {};
      classResults?.forEach((r: any) => {
        const score = Number(r.total_score);
        if (!subjectStats[r.subject_id]) {
          subjectStats[r.subject_id] = { highest: score, lowest: score };
        } else {
          subjectStats[r.subject_id].highest = Math.max(subjectStats[r.subject_id].highest, score);
          subjectStats[r.subject_id].lowest = Math.min(subjectStats[r.subject_id].lowest, score);
        }
      });

      return {
        student: studentRes.data,
        term: termRes.data,
        results: resultsRes.data || [],
        subjectStats,
      };
    },
  });

  const handlePrint = () => {
    if (!data) return;
    const { student, term, results, subjectStats } = data;

    const totalObtainable = results.length * 30;
    const totalObtained = results.reduce((s: number, r: any) => s + Number(r.total_score || 0), 0);
    const average = results.length > 0 ? (totalObtained / results.length) : 0;
    const overallGrade = getGradeInfo(average);

    const studentName = (student as any).full_name ||
      `${(student as any).first_name || ""} ${(student as any).last_name || ""}`.trim();
    const className = (student as any).classes?.name || "—";
    const gender = (student as any).gender ? String((student as any).gender).toUpperCase() : "—";
    const dob = (student as any).date_of_birth;
    const age = dob
      ? `${new Date().getFullYear() - new Date(dob).getFullYear()} YEARS`
      : "—";
    const termName = (term as any)?.name || "—";
    const session = (term as any)?.academic_year || "—";
    const reportHeader = resultType === "mid_term" ? "MID TERM REPORT SHEET" : "END OF TERM REPORT SHEET";
    const scoreLabel = resultType === "mid_term" ? "Mid Term" : "End of Term";
    const logoAbsUrl = new URL(schoolLogo, window.location.href).href;
    const photoUrl = (student as any).avatar_url || "";

    const subjectRows = results
      .map((r: any, i: number) => {
        const score = Number(r.total_score || 0);
        const g = getGradeInfo(score);
        const stats = subjectStats[r.subject_id];
        const highest = stats ? stats.highest : "—";
        const lowest = stats ? stats.lowest : "—";
        const bg = i % 2 === 0 ? "#fff" : "#f8f9fa";
        return `<tr style="background:${bg}">
          <td style="padding:5px 8px;border-bottom:1px solid #ddd">${(r.subjects as any)?.name || "—"}</td>
          <td style="padding:5px 6px;border-bottom:1px solid #ddd;text-align:center">${score}</td>
          <td style="padding:5px 6px;border-bottom:1px solid #ddd;text-align:center;font-weight:bold;color:${g.color}">${g.letter}</td>
          <td style="padding:5px 6px;border-bottom:1px solid #ddd;font-weight:bold;color:${g.color}">${g.remark}</td>
          <td style="padding:5px 6px;border-bottom:1px solid #ddd;text-align:center">${highest}</td>
          <td style="padding:5px 6px;border-bottom:1px solid #ddd;text-align:center">${lowest}</td>
        </tr>`;
      })
      .join("");

    const maxBar = 30;
    const bars = results
      .map((r: any) => {
        const score = Number(r.total_score || 0);
        const g = getGradeInfo(score);
        const h = Math.max(2, Math.round((score / maxBar) * 70));
        const name = ((r.subjects as any)?.name || "").substring(0, 8);
        return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:0">
          <div style="font-size:6px;margin-bottom:1px">${score}</div>
          <div style="width:100%;background:${g.color};height:${h}px;min-height:2px"></div>
          <div style="font-size:5.5px;text-align:center;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%">${name}</div>
        </div>`;
      })
      .join("");

    const gradeKeyRows = GRADE_SCALE.map(
      (g) => `<tr>
        <td style="padding:2px 5px;border:1px solid #ccc">${g.min === 0 ? "< 18" : `${g.min} - ${g.max}`}</td>
        <td style="padding:2px 5px;border:1px solid #ccc;text-align:center;font-weight:bold">${g.letter}</td>
        <td style="padding:2px 5px;border:1px solid #ccc">${g.remark}</td>
        <td style="padding:2px 5px;border:1px solid #ccc;background:${g.color};color:white;text-align:center">&nbsp;</td>
      </tr>`
    ).join("");

    const teacherComment = results[0]?.teacher_comments || "";

    const html = `<!DOCTYPE html><html><head>
      <title>${studentName} — ${reportHeader}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 12px; }
        @media print { body { padding: 0; } @page { margin: 8mm; size: A4; } }
        table { border-collapse: collapse; }
      </style>
    </head><body>

    <!-- Outer header table -->
    <table style="width:100%;border:2px solid #333;margin-bottom:0">
      <tr>
        <td style="border:1px solid #333;padding:6px;text-align:center;width:75px" rowspan="2">
          <img src="${logoAbsUrl}" style="height:55px;max-width:65px" onerror="this.style.display='none'">
        </td>
        <td style="border:1px solid #333;text-align:center;padding:6px 8px">
          <div style="font-size:18px;font-weight:bold;letter-spacing:5px">I T A I N - B E L L &nbsp; S C H O O L S</div>
          <div style="font-size:9px;margin-top:3px;color:#444">7, Mustapha Street, Off Olanrewaju or Olayiwola Street, Oregun, Ikeja, Lagos.</div>
        </td>
      </tr>
      <tr>
        <td style="border:1px solid #333;text-align:center;padding:5px 8px;background:#d6e8f7">
          <strong>${termName.toUpperCase()} ${reportHeader} ${session} SESSION</strong>
        </td>
      </tr>
    </table>

    <!-- Student info table -->
    <table style="width:100%;border:2px solid #333;border-top:0;margin-bottom:0">
      <tr>
        <td style="border:1px solid #333;padding:4px;text-align:center;width:75px;vertical-align:middle" rowspan="4">
          ${photoUrl
            ? `<img src="${photoUrl}" style="width:65px;height:80px;object-fit:cover" onerror="this.style.display='none'">`
            : `<div style="width:65px;height:80px;background:#eee;display:flex;align-items:center;justify-content:center;font-size:8px;color:#999">No Photo</div>`
          }
        </td>
        <td style="border:1px solid #333;padding:4px 8px;width:22%"><strong>Name:</strong></td>
        <td style="border:1px solid #333;padding:4px 8px;width:28%"><strong>${studentName}</strong></td>
        <td style="border:1px solid #333;padding:4px 8px;width:25%"><strong>${scoreLabel} Score Obtainable:</strong></td>
        <td style="border:1px solid #333;padding:4px 8px;font-style:italic">${totalObtainable}</td>
      </tr>
      <tr>
        <td style="border:1px solid #333;padding:4px 8px"><strong>Sex:</strong></td>
        <td style="border:1px solid #333;padding:4px 8px">${gender}</td>
        <td style="border:1px solid #333;padding:4px 8px"><strong>${scoreLabel} Score Obtained:</strong></td>
        <td style="border:1px solid #333;padding:4px 8px;font-style:italic">${totalObtained}</td>
      </tr>
      <tr>
        <td style="border:1px solid #333;padding:4px 8px"><strong>Class:</strong></td>
        <td style="border:1px solid #333;padding:4px 8px">${className}</td>
        <td style="border:1px solid #333;padding:4px 8px"><strong>${scoreLabel} Average:</strong></td>
        <td style="border:1px solid #333;padding:4px 8px;font-style:italic">${average.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="border:1px solid #333;padding:4px 8px"><strong>Age:</strong></td>
        <td style="border:1px solid #333;padding:4px 8px">${age}</td>
        <td style="border:1px solid #333;padding:4px 8px"><strong>${scoreLabel} Grade:</strong></td>
        <td style="border:1px solid #333;padding:4px 8px;font-weight:bold;color:${overallGrade.color}">${overallGrade.letter}</td>
      </tr>
    </table>

    <!-- Section header -->
    <table style="width:100%;border:2px solid #333;border-top:0;margin-bottom:0">
      <tr>
        <td style="border:1px solid #333;padding:4px;text-align:center;font-weight:bold;background:#ebebeb">
          ACADEMICS (COGNITIVE DOMAIN)
        </td>
      </tr>
    </table>

    <!-- Results + chart side by side -->
    <table style="width:100%;border:2px solid #333;border-top:0;margin-bottom:0">
      <tr>
        <td style="border:1px solid #333;padding:0;vertical-align:top;width:58%">
          <table style="width:100%;border-collapse:collapse;font-size:10px">
            <thead>
              <tr style="background:#d6e8f7">
                <th style="padding:5px 8px;border-bottom:1px solid #333;text-align:left">SUBJECTS</th>
                <th style="padding:5px 4px;border-bottom:1px solid #333;text-align:center">${scoreLabel}<br>Total (30)</th>
                <th style="padding:5px 4px;border-bottom:1px solid #333;text-align:center">Grade</th>
                <th style="padding:5px 4px;border-bottom:1px solid #333;text-align:center">Remark</th>
                <th style="padding:5px 4px;border-bottom:1px solid #333;text-align:center">Highest<br>Score in<br>Class</th>
                <th style="padding:5px 4px;border-bottom:1px solid #333;text-align:center">Lowest<br>Score in<br>Class</th>
              </tr>
            </thead>
            <tbody>${subjectRows || `<tr><td colspan="6" style="padding:16px;text-align:center;color:#aaa">No results recorded.</td></tr>`}</tbody>
          </table>
        </td>
        <td style="border:1px solid #333;padding:8px;vertical-align:top;width:42%">
          <div style="font-size:9px;font-weight:bold;text-align:center;margin-bottom:4px">${scoreLabel} Total (30)</div>
          <div style="display:flex;align-items:flex-end;height:75px;gap:1px;border-left:1px solid #999;border-bottom:1px solid #999;padding:0 2px">
            ${bars}
          </div>
          <div style="font-size:7px;text-align:center;margin-top:2px;color:#555">■ ${scoreLabel} Total (30)</div>
          <br>
          <table style="width:100%;border-collapse:collapse;font-size:9px">
            <thead>
              <tr style="background:#333;color:white">
                <th style="padding:3px 5px;text-align:left">Score</th>
                <th style="padding:3px 5px">Grade</th>
                <th style="padding:3px 5px">Description</th>
                <th style="padding:3px 5px">Colour</th>
              </tr>
            </thead>
            <tbody>${gradeKeyRows}</tbody>
          </table>
          <div style="font-size:8px;margin-top:4px;color:#555">
            N.B: PTE means PROGRESSING TOWARDS EXPECTATION and NME means NOT MEETING EXPECTATION
          </div>
        </td>
      </tr>
    </table>

    <!-- Teacher Comments -->
    <table style="width:100%;border:2px solid #333;border-top:0;margin-bottom:0">
      <tr>
        <td colspan="3" style="border:1px solid #333;padding:2px 8px;background:#ebebeb;font-weight:bold;font-size:10px">
          Teacher Comments
        </td>
      </tr>
      <tr>
        <td style="border:1px solid #333;padding:5px 8px;width:50%;font-size:10px">${teacherComment}</td>
        <td style="border:1px solid #333;padding:5px 8px;font-size:10px">Date:</td>
        <td style="border:1px solid #333;padding:5px 8px;font-size:10px">Signature:</td>
      </tr>
    </table>

    <!-- Head Teacher Comments -->
    <table style="width:100%;border:2px solid #333;border-top:0">
      <tr>
        <td colspan="3" style="border:1px solid #333;padding:2px 8px;background:#ebebeb;font-weight:bold;font-size:10px">
          Head Teacher Comments
        </td>
      </tr>
      <tr>
        <td style="border:1px solid #333;padding:5px 8px;width:50%;font-size:10px">&nbsp;</td>
        <td style="border:1px solid #333;padding:5px 8px;font-size:10px">Date:</td>
        <td style="border:1px solid #333;padding:5px 8px;font-size:10px">Signature:</td>
      </tr>
    </table>

    </body></html>`;

    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) return null;

  const { student, term, results } = data;
  const totalObtained = results.reduce((s: number, r: any) => s + Number(r.total_score || 0), 0);
  const average = results.length > 0 ? totalObtained / results.length : 0;
  const overallGrade = getGradeInfo(average);
  const studentName = (student as any).full_name ||
    `${(student as any).first_name || ""} ${(student as any).last_name || ""}`.trim();
  const reportLabel = resultType === "mid_term" ? "Mid Term" : "End of Term";

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <span className="font-heading text-foreground text-lg">{studentName}</span>
            <span className="ml-2 text-sm text-muted-foreground">— {reportLabel} Report Card</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="hero-gradient gap-2">
              <Printer size={16} /> Print / Download
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="p-6 space-y-4 text-sm">
          <div className="text-center font-bold text-base uppercase tracking-wide border-b pb-3">
            {(term as any)?.name} {reportLabel} Report — {(term as any)?.academic_year}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-muted-foreground">Student:</span> <strong>{studentName}</strong></div>
            <div><span className="text-muted-foreground">Class:</span> <strong>{(student as any)?.classes?.name || "—"}</strong></div>
            <div><span className="text-muted-foreground">Total Obtained:</span> <strong>{totalObtained} / {results.length * 30}</strong></div>
            <div>
              <span className="text-muted-foreground">Overall Grade:</span>{" "}
              <span className="font-bold text-base" style={{ color: overallGrade.color }}>
                {overallGrade.letter} — {overallGrade.remark}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left p-2 font-medium">Subject</th>
                  <th className="text-center p-2 font-medium">Score /30</th>
                  <th className="text-center p-2 font-medium">Grade</th>
                  <th className="text-left p-2 font-medium">Remark</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r: any) => {
                  const score = Number(r.total_score || 0);
                  const g = getGradeInfo(score);
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="p-2">{(r.subjects as any)?.name || "—"}</td>
                      <td className="p-2 text-center font-semibold">{score}</td>
                      <td className="p-2 text-center font-bold" style={{ color: g.color }}>{g.letter}</td>
                      <td className="p-2 font-medium" style={{ color: g.color }}>{g.remark}</td>
                    </tr>
                  );
                })}
                {!results.length && (
                  <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No results for this report type.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Click "Print / Download" to generate the full formatted report card.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReportCard;
