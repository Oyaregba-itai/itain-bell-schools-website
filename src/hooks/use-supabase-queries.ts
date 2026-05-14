import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

// Types
export type Result = Database["public"]["Tables"]["results"]["Row"];
export type Student = Database["public"]["Tables"]["students"]["Row"];
export type Term = Database["public"]["Tables"]["terms"]["Row"];
export type Assignment = Database["public"]["Tables"]["assignments"]["Row"];
export type Test = Database["public"]["Tables"]["tests"]["Row"];
export type Event = Database["public"]["Tables"]["events"]["Row"];

// Hooks for Results
export const useStudentResults = (studentId: string, termId?: string) => {
  return useQuery({
    queryKey: ["results", studentId, termId],
    queryFn: async () => {
      let query = supabase
        .from("results")
        .select(
          `
          *,
          subjects:subject_id(*),
          terms:term_id(*)
        `
        )
        .eq("student_id", studentId);

      if (termId) {
        query = query.eq("term_id", termId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

// Hooks for Teachers - Upload Results
export const useUploadResults = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (results: Partial<Result>[]) => {
      const { data, error } = await supabase
        .from("results")
        .insert(results)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["results"] });
    },
  });
};

// Hooks for Assignments
export const useAssignments = (subjectId: string) => {
  return useQuery({
    queryKey: ["assignments", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .eq("subject_id", subjectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

// Hooks for Assignment Scores
export const useAssignmentScores = (assignmentId: string) => {
  return useQuery({
    queryKey: ["assignment-scores", assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_scores")
        .select(
          `
          *,
          students:student_id(first_name, last_name, student_id)
        `
        )
        .eq("assignment_id", assignmentId);

      if (error) throw error;
      return data;
    },
  });
};

// Hooks for Tests
export const useTests = (subjectId: string) => {
  return useQuery({
    queryKey: ["tests", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tests")
        .select("*")
        .eq("subject_id", subjectId)
        .order("test_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

// Hooks for Test Scores
export const useTestScores = (testId: string) => {
  return useQuery({
    queryKey: ["test-scores", testId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_scores")
        .select(
          `
          *,
          students:student_id(first_name, last_name, student_id)
        `
        )
        .eq("test_id", testId);

      if (error) throw error;
      return data;
    },
  });
};

// Hooks for Events
export const useUpcomingEvents = () => {
  return useQuery({
    queryKey: ["upcoming-events"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("start_date", today)
        .order("start_date", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
};

// Hooks for Announcements
export const useAnnouncements = () => {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

// Hooks for Attendance
export const useStudentAttendance = (studentId: string, monthYear?: string) => {
  return useQuery({
    queryKey: ["attendance", studentId, monthYear],
    queryFn: async () => {
      let query = supabase
        .from("attendance")
        .select("*")
        .eq("student_id", studentId);

      if (monthYear) {
        const startDate = `${monthYear}-01`;
        const endDate = new Date(monthYear + "-01");
        endDate.setMonth(endDate.getMonth() + 1);
        const endDateStr = endDate.toISOString().split("T")[0];

        query = query
          .gte("attendance_date", startDate)
          .lt("attendance_date", endDateStr);
      }

      const { data, error } = await query.order("attendance_date", {
        ascending: false,
      });

      if (error) throw error;
      return data;
    },
  });
};

// Hooks for Terms
export const useTerms = () => {
  return useQuery({
    queryKey: ["terms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("terms")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

// Hooks for Active Term
export const useActiveTerm = () => {
  return useQuery({
    queryKey: ["active-term"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("terms")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });
};
