import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { type, title, body, recipients } = await req.json();
    // type: "message" | "announcement" | "event" | "result"
    // recipients: array of user_ids to notify
    // title: notification title
    // body: notification body

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured. Add RESEND_API_KEY to Edge Function secrets." }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get profiles + notification settings for each recipient
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, notification_emails, notification_settings")
      .in("user_id", recipients || []);

    const sent: string[] = [];
    const failed: string[] = [];

    for (const profile of profiles || []) {
      const settings: Record<string, boolean> = profile.notification_settings || {};
      const notifEmails: string[] = profile.notification_emails || [];

      // Check if user has this type enabled
      if (settings[type] === false) continue;

      // Collect all emails to send to
      const allEmails = [...new Set([
        profile.email,
        ...notifEmails,
      ].filter(Boolean))];

      for (const email of allEmails) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Itain-Bell Schools <notifications@itainbellschool.com>",
              to: [email],
              subject: `[Itain-Bell Schools] ${title}`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
                  <div style="background:linear-gradient(135deg,#1e40af,#1e3a8a);padding:20px;border-radius:12px 12px 0 0">
                    <h1 style="color:white;margin:0;font-size:20px">Itain-Bell Schools</h1>
                  </div>
                  <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px;padding:24px">
                    <p style="color:#64748b;font-size:14px;margin-top:0">Hi ${profile.full_name || "there"},</p>
                    <h2 style="color:#1e293b;font-size:18px">${title}</h2>
                    <p style="color:#475569;font-size:14px;line-height:1.6">${body}</p>
                    <a href="https://itainbellschool.com/dashboard" style="display:inline-block;background:#1e40af;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;margin-top:8px">
                      Open Portal
                    </a>
                    <p style="color:#94a3b8;font-size:12px;margin-top:24px">
                      You received this because you have email notifications enabled for your Itain-Bell Schools account.
                      <a href="https://itainbellschool.com/dashboard" style="color:#1e40af">Manage preferences</a>
                    </p>
                  </div>
                </div>
              `,
            }),
          });
          if (res.ok) sent.push(email);
          else failed.push(email);
        } catch { failed.push(email); }
      }
    }

    return new Response(JSON.stringify({ sent: sent.length, failed: failed.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
