import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      // ===== Stripe Checkout (Sitter Premium Subscription) =====

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (userId) {
          await supabase
            .from("sitter_profiles")
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_status: "active",
              is_public: true,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          await supabase
            .from("sitter_profiles")
            .update({
              subscription_status: "active",
              is_public: true,
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          await supabase
            .from("sitter_profiles")
            .update({
              subscription_status: "past_due",
              is_public: false,
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase
          .from("sitter_profiles")
          .update({
            subscription_status: "canceled",
            is_public: false,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const status = subscription.status === "active" ? "active" : "inactive";

        await supabase
          .from("sitter_profiles")
          .update({
            subscription_status: status,
            is_public: status === "active",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      // ===== Stripe Identity (Sitter ID Verification) =====

      case "identity.verification_session.verified": {
        const session = event.data.object as any;
        const userId = session.metadata?.user_id;
        const sessionId = session.id;

        await supabase
          .from("identity_verifications")
          .update({
            status: "verified",
            verified_at: new Date().toISOString(),
          })
          .eq("stripe_session_id", sessionId);

        if (userId) {
          await supabase
            .from("sitter_profiles")
            .update({
              identity_verified: true,
              phone_verified: true,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        }

        console.log(`Identity verified for user ${userId}`);
        break;
      }

      case "identity.verification_session.requires_input": {
        const session = event.data.object as any;
        const sessionId = session.id;

        await supabase
          .from("identity_verifications")
          .update({ status: "requires_input" })
          .eq("stripe_session_id", sessionId);

        console.log(`Identity requires input for session ${sessionId}`);
        break;
      }

      case "identity.verification_session.processing": {
        const session = event.data.object as any;
        const sessionId = session.id;

        await supabase
          .from("identity_verifications")
          .update({ status: "processing" })
          .eq("stripe_session_id", sessionId);
        break;
      }
    }
  } catch (err) {
    console.error("Error processing webhook:", err);
    return new Response("Webhook processing error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
