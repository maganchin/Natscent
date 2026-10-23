/* ------------------------------------------------------------------
   Contact form.
   Submissions are posted to FormSubmit, which emails the studio inbox
   (CONTACT_EMAIL). Browsers cannot send mail themselves; this is the
   delivery path. If the request fails, we fall back to a mailto draft
   so the visitor can still reach us.
   ------------------------------------------------------------------ */

export const CONTACT_EMAIL = "soojipark.sparkchances@gmail.com";

const SUBMIT_ENDPOINT = `https://formsubmit.co/ajax/${CONTACT_EMAIL}`;

interface FieldRule {
  id: string;
  label: string;
  required: boolean;
  message?: string;
}

const RULES: FieldRule[] = [
  { id: "f-name", label: "Name", required: true, message: "Please share your name." },
  { id: "f-email", label: "Email", required: true, message: "Please add an email so we can reply." },
  { id: "f-message", label: "Message", required: true, message: "Please add a short message." },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function control(id: string): FormControl {
  return document.getElementById(id) as FormControl;
}

function errorEl(id: string): HTMLElement {
  return document.getElementById(`${id}-error`)!;
}

function validateField(rule: FieldRule): boolean {
  const el = control(rule.id);
  const value = el.value.trim();
  let message = "";

  if (rule.required && value === "") {
    message = rule.message ?? `Please complete “${rule.label}”.`;
  } else if (rule.id === "f-email" && value !== "" && !EMAIL_RE.test(value)) {
    message = "That email doesn't look complete. Please check it.";
  }

  el.setAttribute("aria-invalid", message ? "true" : "false");
  errorEl(rule.id).textContent = message;
  return message === "";
}

function composeMessage(): string {
  const v = (id: string) => control(id).value.trim() || "Not provided";
  return [
    `Name: ${v("f-name")}`,
    `Email: ${v("f-email")}`,
    "",
    v("f-message"),
  ].join("\n");
}

function mailtoHref(): string {
  const name = control("f-name").value.trim();
  const subject = `Website contact form: ${name}`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(composeMessage())}`;
}

interface SubmitResult {
  ok: boolean;
  needsActivation?: boolean;
}

async function deliverMessage(): Promise<SubmitResult> {
  const honey = (document.getElementById("f-honey") as HTMLInputElement | null)?.value ?? "";
  if (honey.trim() !== "") {
    return { ok: true };
  }

  const name = control("f-name").value.trim();
  const email = control("f-email").value.trim();
  const message = control("f-message").value.trim();

  const response = await fetch(SUBMIT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      message,
      _subject: `Website contact form: ${name}`,
      _template: "table",
      _captcha: "false",
      _honey: honey,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean | string; message?: string }
    | null;

  const successFlag = payload?.success;
  const ok = response.ok && (successFlag === true || successFlag === "true");
  const note = (payload?.message ?? "").toLowerCase();
  const needsActivation = note.includes("activat");

  return { ok, needsActivation };
}

export function initContactForm(): void {
  const form = document.getElementById("contact-form") as HTMLFormElement;
  const status = document.getElementById("contact-status")!;
  const statusTitle = document.getElementById("contact-status-title")!;
  const statusBody = document.getElementById("contact-status-body")!;
  const statusActions = document.getElementById("contact-status-actions")!;
  const copyButton = document.getElementById("copy-brief") as HTMLButtonElement;
  const draftLink = document.getElementById("open-draft-link") as HTMLAnchorElement;
  const submitButton = document.getElementById("contact-submit") as HTMLButtonElement;
  const defaultSubmitLabel = submitButton.textContent ?? "Send Message";
  let attempted = false;

  for (const rule of RULES) {
    control(rule.id).addEventListener("blur", () => {
      if (attempted) validateField(rule);
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    attempted = true;

    const results = RULES.map((rule) => validateField(rule));
    const firstInvalid = results.indexOf(false);
    if (firstInvalid !== -1) {
      control(RULES[firstInvalid].id).focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Sending…";
    status.hidden = true;

    try {
      const result = await deliverMessage();
      if (result.ok) {
        form.reset();
        attempted = false;
        for (const rule of RULES) {
          control(rule.id).setAttribute("aria-invalid", "false");
          errorEl(rule.id).textContent = "";
        }
        showStatus(
          status,
          statusTitle,
          statusBody,
          statusActions,
          "Thank you — your message is on its way.",
          "We've sent your message to the Spark Chances team. We'll reply to the address you shared.",
          false,
        );
        submitButton.textContent = defaultSubmitLabel;
        submitButton.disabled = false;
        return;
      }

      draftLink.href = mailtoHref();
      if (result.needsActivation) {
        showStatus(
          status,
          statusTitle,
          statusBody,
          statusActions,
          "One more step on our side.",
          "We've sent an activation email to the Spark Chances inbox. Once that is confirmed, new messages will arrive there. In the meantime you can still send this note from your own email.",
          true,
        );
      } else {
        showFallback(status, statusTitle, statusBody, statusActions, draftLink);
      }
    } catch {
      draftLink.href = mailtoHref();
      showFallback(status, statusTitle, statusBody, statusActions, draftLink);
    }

    submitButton.textContent = defaultSubmitLabel;
    submitButton.disabled = false;
  });

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(composeMessage());
      copyButton.textContent = "Copied";
      setTimeout(() => (copyButton.textContent = "or copy your message"), 2500);
    } catch {
      copyButton.textContent = "Copy failed. Select the text manually.";
    }
  });
}

function showStatus(
  status: HTMLElement,
  title: HTMLElement,
  body: HTMLElement,
  actions: HTMLElement,
  heading: string,
  copy: string,
  showFallbackActions: boolean,
): void {
  title.textContent = heading;
  body.textContent = copy;
  actions.hidden = !showFallbackActions;
  status.hidden = false;
  status.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function showFallback(
  status: HTMLElement,
  title: HTMLElement,
  body: HTMLElement,
  actions: HTMLElement,
  draftLink: HTMLAnchorElement,
): void {
  showStatus(
    status,
    title,
    body,
    actions,
    "We couldn't send from the site just now.",
    "Open the draft below, press send, and we'll get back to you shortly.",
    true,
  );
  draftLink.focus({ preventScroll: true });
}
