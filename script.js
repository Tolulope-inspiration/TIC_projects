const STORAGE_KEY = "healthtriage-history";
const RESULT_KEY = "healthtriage-result";

const page = document.body ? document.body.dataset.page : "";

const symptomLabels = {
  fever: "Fever",
  cough: "Cough",
  fatigue: "Fatigue / weakness",
  headache: "Headache",
  vomiting: "Vomiting",
  diarrhoea: "Diarrhoea",
  "shortness-of-breath": "Shortness of breath",
  "chest-pain": "Chest pain"
};

const durationLabels = {
  "less-than-24-hours": "Less than 24 hours",
  "1-to-3-days": "1 to 3 days",
  "4-to-7-days": "4 to 7 days",
  "more-than-7-days": "More than 7 days",
  "several-weeks": "Several weeks"
};

const warningLabels = {
  breathing: "Difficulty breathing",
  confusion: "Confusion",
  fainting: "Fainting",
  "severe-dehydration": "Severe dehydration",
  "severe-pain": "Severe pain",
  bleeding: "Severe bleeding"
};

const triagePalette = {
  emergency: {
    level: "Emergency care",
    className: "emergency",
    title: "Emergency care is recommended.",
    summary: "This pattern may require immediate clinical attention and should be treated as urgent.",
    nextStep: "Call 112 or go to the nearest emergency department immediately. Do not delay if symptoms are severe, worsening, or life-threatening."
  },
  urgent: {
    level: "Urgent medical attention",
    className: "urgent",
    title: "Urgent medical attention is recommended.",
    summary: "The reported symptoms are serious enough to merit prompt clinical review, especially if they continue to worsen.",
    nextStep: "Book a same-day review with a clinic, primary care provider, or urgent care centre and monitor the patient carefully."
  },
  monitor: {
    level: "Medical consultation recommended",
    className: "monitor",
    title: "Medical consultation is recommended soon.",
    summary: "The symptom pattern is concerning enough to warrant a clinician review within a short timeframe.",
    nextStep: "Arrange a prompt consultation with a doctor or clinic, and seek earlier attention if symptoms worsen."
  },
  selfcare: {
    level: "Self-care and monitoring",
    className: "selfcare",
    title: "Self-care and monitoring may be appropriate for now.",
    summary: "The symptoms look mild or manageable, but they still warrant careful monitoring and review if they worsen.",
    nextStep: "Rest, hydrate, and monitor symptoms closely. Seek professional help if the condition worsens or persists beyond a reasonable period."
  }
};

const formState = {
  currentStep: 1,
  totalSteps: 5
};

function initThemeToggle() {
  const navWrap = document.querySelector(".nav-wrap");
  if (!navWrap) return;

  const toggle = navWrap.querySelector(".theme-toggle") || document.createElement("button");
  if (!toggle.parentElement) {
    toggle.type = "button";
    toggle.className = "theme-toggle";
    navWrap.insertBefore(toggle, navWrap.querySelector(".nav-cta"));
  }
  toggle.setAttribute("aria-pressed", "false");

  const applyTheme = (theme) => {
    const isDark = theme === "dark";
    document.body.dataset.theme = isDark ? "dark" : "light";
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    toggle.innerHTML = `<span aria-hidden="true">${isDark ? "☀" : "◐"}</span><span>${isDark ? "Light mode" : "Dark mode"}</span>`;
  };

  toggle.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("healthtriage-theme", nextTheme);
    applyTheme(nextTheme);
  });

  applyTheme(localStorage.getItem("healthtriage-theme") || "light");
}

function safeJsonRead(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Unable to read ${key}:`, error);
    return fallback;
  }
}

function safeJsonWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Unable to save ${key}:`, error);
    return false;
  }
}

function generateRecordId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `record-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getFormData() {
  const form = document.getElementById("assessmentForm");
  if (!form) return null;

  const formData = new FormData(form);

  return {
    age: formData.get("age")?.toString().trim() || "",
    temperature: formData.get("temperature")?.toString().trim() || "",
    gender: formData.get("gender")?.toString().trim() || "",
    symptoms: formData.getAll("symptoms"),
    duration: formData.get("duration")?.toString().trim() || "",
    severity: formData.get("severity")?.toString().trim() || "",
    warningSigns: formData.getAll("warningSigns"),
    notes: formData.get("notes")?.toString().trim() || ""
  };
}

function setFieldError(fieldName, message) {
  const field = document.querySelector(`#${fieldName}`)?.closest(".field");
  if (!field) return;

  field.classList.add("has-error");
  const errorElement = field.querySelector(".field-error");
  if (errorElement) {
    errorElement.textContent = message;
  }
}

function clearFieldError(fieldName) {
  const field = document.querySelector(`#${fieldName}`)?.closest(".field");
  if (!field) return;

  field.classList.remove("has-error");
  const errorElement = field.querySelector(".field-error");
  if (errorElement) {
    errorElement.textContent = "";
  }
}

function setInlineMessage(message, type = "info") {
  const statusNode = document.getElementById("formStatus");
  if (!statusNode) return;

  statusNode.textContent = message;
  statusNode.className = `form-status ${type}`;
}

function validateCurrentStep(stepNumber) {
  const data = getFormData();
  if (!data) return false;

  const errors = [];

  if (stepNumber === 1) {
    const age = Number.parseFloat(data.age);
    const temperature = Number.parseFloat(data.temperature);

    clearFieldError("age");
    clearFieldError("temperature");

    if (!data.age || !Number.isFinite(age) || age <= 0 || age > 120) {
      errors.push(["age", "Please enter a valid age between 1 and 120."]);
    }

    if (!data.temperature || !Number.isFinite(temperature) || temperature < 34 || temperature > 45) {
      errors.push(["temperature", "Please enter a valid temperature between 34°C and 45°C."]);
    }
  }

  if (stepNumber === 2) {
    const symptomsError = document.querySelector('[data-error-for="symptoms"]');
    if (symptomsError) symptomsError.textContent = "";

    if (!data.symptoms || data.symptoms.length === 0) {
      errors.push(["symptoms", "Please select at least one symptom."]);
    }
  }

  if (stepNumber === 3) {
    clearFieldError("duration");
    const severityError = document.querySelector('[data-error-for="severity"]');
    if (severityError) severityError.textContent = "";

    if (!data.duration) {
      errors.push(["duration", "Please select how long symptoms have been present."]);
    }

    if (!document.querySelector('input[name="severity"]:checked')) {
      errors.push(["severity", "Please indicate the overall severity."]);
    }
  }

  if (errors.length > 0) {
    errors.forEach(([fieldName, message]) => {
      if (fieldName === "symptoms") {
        const symptomError = document.querySelector('[data-error-for="symptoms"]');
        if (symptomError) symptomError.textContent = message;
        return;
      }

      setFieldError(fieldName, message);
    });

    setInlineMessage("Please complete the highlighted fields before continuing.", "error");
    return false;
  }

  setInlineMessage("Great. The required information is complete.", "success");
  return true;
}

function updateProgress() {
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");

  if (!progressFill || !progressText) return;

  const percentage = (formState.currentStep / formState.totalSteps) * 100;
  progressFill.style.width = `${percentage}%`;
  progressText.textContent = `Step ${formState.currentStep} of ${formState.totalSteps}`;
}

function showStep(stepNumber) {
  const panels = document.querySelectorAll(".step-panel");
  panels.forEach((panel) => {
    panel.classList.toggle("active", Number(panel.dataset.step) === Number(stepNumber));
  });

  const nextBtn = document.getElementById("nextBtn");
  const backBtn = document.getElementById("backBtn");
  const submitBtn = document.getElementById("submitBtn");

  if (nextBtn) nextBtn.classList.toggle("hidden", stepNumber === formState.totalSteps);
  if (backBtn) backBtn.classList.toggle("hidden", stepNumber === 1);
  if (submitBtn) submitBtn.classList.toggle("hidden", stepNumber !== formState.totalSteps);

  formState.currentStep = stepNumber;
  updateProgress();

  if (stepNumber === formState.totalSteps) {
    renderReviewSummary();
  }
}

function renderReviewSummary() {
  const reviewSummary = document.getElementById("reviewSummary");
  if (!reviewSummary) return;

  const data = getFormData();
  if (!data) return;

  const selectedSymptoms = data.symptoms.map((symptom) => symptomLabels[symptom] || symptom);
  const warnings = data.warningSigns.map((warning) => warningLabels[warning] || warning);

  reviewSummary.innerHTML = `
    <ul class="review-list">
      <li><strong>Age:</strong> ${data.age || "Not provided"}</li>
      <li><strong>Temperature:</strong> ${data.temperature ? `${data.temperature}°C` : "Not provided"}</li>
      <li><strong>Patient category:</strong> ${data.gender || "Not provided"}</li>
      <li><strong>Symptoms:</strong> ${selectedSymptoms.length ? selectedSymptoms.join(", ") : "No symptoms selected"}</li>
      <li><strong>Duration:</strong> ${durationLabels[data.duration] || data.duration || "Not provided"}</li>
      <li><strong>Severity:</strong> ${data.severity || "Not provided"}</li>
      <li><strong>Warning signs:</strong> ${warnings.length ? warnings.join(", ") : "None reported"}</li>
      <li><strong>Notes:</strong> ${data.notes || "No additional notes"}</li>
    </ul>
  `;
}

function handleNextStep() {
  if (!validateCurrentStep(formState.currentStep)) {
    return;
  }

  if (formState.currentStep < formState.totalSteps) {
    showStep(formState.currentStep + 1);
  }
}

function handlePreviousStep() {
  if (formState.currentStep > 1) {
    showStep(formState.currentStep - 1);
  }
}

function getAiEducationalSummary(data, triage) {
  const selectedSymptoms = data.symptoms.length
    ? data.symptoms.map((symptom) => symptomLabels[symptom] || symptom).join(", ")
    : "No symptoms selected";

  const warningSummary = data.warningSigns.length
    ? data.warningSigns.map((warning) => warningLabels[warning] || warning).join(", ")
    : "No major warning signs reported";

  return `Based on the selected symptoms (${selectedSymptoms}), duration (${durationLabels[data.duration] || data.duration || "not provided"}), and severity (${data.severity || "not provided"}), the app classifies this as ${triage.level.toLowerCase()}. This educational summary is not a diagnosis. The most important safety signals are ${warningSummary}.`;
  let concern = "The selected symptoms may reflect a short-term health concern, but this form cannot safely identify the underlying illness.";

  if (data.warningSigns.length || data.symptoms.includes("shortness-of-breath") || data.symptoms.includes("chest-pain")) {
    concern = "The main health concern is that the reported warning signs can affect breathing, circulation, alertness, or hydration and need prompt professional assessment.";
  } else if (data.symptoms.includes("vomiting") || data.symptoms.includes("diarrhoea")) {
    concern = "The main health concern is fluid loss and dehydration, especially if the person cannot keep fluids down or symptoms continue.";
  } else if (Number.parseFloat(data.temperature) >= 38) {
    concern = "The main health concern is an elevated temperature, which can occur with infection or inflammation and should be monitored over time.";
  }

  const urgency = triage.emergency
    ? "Because warning signs were reported, seek urgent care now rather than waiting for an online explanation."
    : `The current rule-based result is ${triage.level.toLowerCase()}; seek earlier care if symptoms worsen or new warning signs appear.`;

  return `Based on the selected symptoms (${selectedSymptoms}), duration (${durationLabels[data.duration] || data.duration || "not provided"}), and severity (${data.severity || "not provided"}), this safety-bounded AI explainer highlights a health concern rather than diagnosing an illness: ${concern} ${urgency} The important safety signals are ${warningSummary}.`;
}

function determineTriage(data) {
  const symptoms = new Set(data.symptoms);
  const warningSet = new Set(data.warningSigns);
  const temperature = Number.parseFloat(data.temperature) || 0;
  const age = Number.parseFloat(data.age) || 0;

  const emergency =
    warningSet.has("breathing") ||
    warningSet.has("confusion") ||
    warningSet.has("fainting") ||
    warningSet.has("severe-pain") ||
    warningSet.has("bleeding") ||
    symptoms.has("shortness-of-breath") ||
    symptoms.has("chest-pain") ||
    temperature >= 40.5 ||
    (age <= 5 && temperature >= 38.5);

  if (emergency) {
    return { ...triagePalette.emergency, emergency: true, risk: "high" };
  }

  const urgent =
    data.severity === "severe" ||
    temperature >= 38.0 ||
    data.duration === "4-to-7-days" ||
    data.duration === "more-than-7-days" ||
    data.duration === "several-weeks" ||
    symptoms.has("vomiting") ||
    symptoms.has("diarrhoea") ||
    warningSet.has("severe-dehydration");

  if (urgent) {
    return { ...triagePalette.urgent, emergency: false, risk: "medium" };
  }

  const monitor = data.severity === "moderate" || data.duration === "1-to-3-days" || symptoms.size >= 2;
  if (monitor) {
    return { ...triagePalette.monitor, emergency: false, risk: "medium" };
  }

  return { ...triagePalette.selfcare, emergency: false, risk: "low" };
}

function saveHistory(record) {
  const history = safeJsonRead(STORAGE_KEY, []);
  const nextList = [record, ...history].slice(0, 25);

  if (!safeJsonWrite(STORAGE_KEY, nextList)) {
    setInlineMessage("Your assessment could not be saved locally. Please check browser storage permissions.", "error");
    return false;
  }

  return true;
}

function renderResult() {
  const resultContainer = document.getElementById("resultContainer");
  if (!resultContainer) return;

  const data = JSON.parse(sessionStorage.getItem(RESULT_KEY) || "null");
  if (!data) {
    resultContainer.innerHTML = `
      <p class="eyebrow">Triage recommendation</p>
      <h1>No result available</h1>
      <p class="result-note">Complete the assessment to generate a triage recommendation.</p>
      <div class="cta-row">
        <a href="assessment.html" class="button button-primary">Start Assessment</a>
      </div>
    `;
    return;
  }

  const triage = determineTriage(data);
  const educationalSummary = getAiEducationalSummary(data, triage);

  resultContainer.innerHTML = `
    <div class="result-header ${triage.className}">
      <p class="eyebrow">Triage recommendation</p>
      <span class="result-status ${triage.className}">${triage.level}</span>
    </div>

    <h1>${triage.title}</h1>
    <p class="result-summary">${triage.summary}</p>

    ${triage.emergency ? `
      <div class="alert-box emergency-alert">
        <h3>Emergency guidance</h3>
        <p>Immediate emergency care is strongly recommended. Call 112 in Nigeria or go to the nearest emergency department now.</p>
        <ul>
          <li>Use the nearest emergency facility if symptoms are worsening or severe.</li>
          <li>Do not delay to wait for a clinic appointment.</li>
          <li>If the patient is struggling to breathe or has severe chest pain, get urgent help immediately.</li>
        </ul>
      </div>
    ` : ""}

    <div class="result-grid">
      <div class="info-card">
        <h3>Assessment summary</h3>
        <ul class="summary-list">
          <li><strong>Age:</strong> ${data.age || "Not provided"}</li>
          <li><strong>Temperature:</strong> ${data.temperature ? `${data.temperature}°C` : "Not provided"}</li>
          <li><strong>Symptoms:</strong> ${data.symptoms.length ? data.symptoms.map((item) => symptomLabels[item] || item).join(", ") : "Not provided"}</li>
          <li><strong>Duration:</strong> ${durationLabels[data.duration] || data.duration || "Not provided"}</li>
          <li><strong>Severity:</strong> ${data.severity || "Not provided"}</li>
          <li><strong>Warnings:</strong> ${data.warningSigns.length ? data.warningSigns.map((item) => warningLabels[item] || item).join(", ") : "None reported"}</li>
        </ul>
      </div>

      <div class="info-card educational-card">
        <h3>Educational summary</h3>
        <p>${educationalSummary}</p>
        <div class="ai-explainer">
          <h3>AI health explainer</h3>
          <p>This explanation is generated from your answers to help you understand the concern. It cannot confirm a disease, prescribe medicine, or replace a clinician.</p>
        </div>
        <div class="disclaimer-box">
          <strong>Important:</strong> This is a prototype recommendation for guidance only. It is not a diagnosis, and it does not replace a qualified doctor or nurse.
        </div>
      </div>
    </div>

    <div class="alert-box">
      <h3>Recommended next step</h3>
      <p>${triage.nextStep}</p>
    </div>

    <div class="cta-row">
      <a href="assessment.html" class="button button-primary">Restart Assessment</a>
      <a href="history.html" class="button button-secondary">View History</a>
    </div>
  `;
}

function renderHistory() {
  const historyContainer = document.getElementById("historyContainer");
  if (!historyContainer) return;

  const history = safeJsonRead(STORAGE_KEY, []);

  historyContainer.innerHTML = `
    <div class="history-toolbar">
      <div>
        <h2>Saved assessments</h2>
      </div>
      <div class="history-actions">
        <button type="button" class="button button-secondary" id="exportHistoryBtn">Export JSON</button>
        <label class="button button-secondary import-button" for="importHistoryInput">Import JSON</label>
        <input id="importHistoryInput" type="file" accept="application/json" hidden />
      </div>
    </div>
  `;

  if (!history.length) {
    historyContainer.insertAdjacentHTML(
      "beforeend",
      `
        <div class="card history-item empty-history">
          <h3>No saved assessments yet</h3>
          <p>Your completed triage reviews will appear here once you submit an assessment.</p>
          <a href="assessment.html" class="button button-primary">Start a new assessment</a>
        </div>
      `
    );

    document.getElementById("exportHistoryBtn")?.addEventListener("click", () => {
      setInlineMessage("There is no saved history to export yet.", "info");
    });

    document.getElementById("importHistoryInput")?.addEventListener("change", handleImportHistory);
    return;
  }

  historyContainer.insertAdjacentHTML(
    "beforeend",
    history
      .map(
        (entry) => `
          <article class="card history-item ${entry.className ? `history-${entry.className}` : ""}">
            <div class="history-item-head">
              <div>
                <p class="eyebrow small-eyebrow">Assessment result</p>
                <h3>${entry.level}</h3>
              </div>
              <span class="mini-tag ${entry.className || "selfcare"}">${entry.level}</span>
            </div>

            <div class="history-meta">
              <span>${new Date(entry.date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>
              <span>${entry.symptoms?.length ? entry.symptoms.map((item) => symptomLabels[item] || item).join(", ") : "No symptoms listed"}</span>
            </div>

            <div class="history-actions-inline">
              <button type="button" class="button button-secondary small-button" data-open-id="${entry.id}">Open</button>
              <button type="button" class="button button-ghost small-button" data-delete-id="${entry.id}">Delete</button>
            </div>
          </article>
        `
      )
      .join("")
  );

  document.getElementById("exportHistoryBtn")?.addEventListener("click", exportHistory);
  document.getElementById("importHistoryInput")?.addEventListener("change", handleImportHistory);

  document.querySelectorAll("[data-open-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.openId;
      const record = history.find((entry) => entry.id === id);
      if (!record) return;

      sessionStorage.setItem(RESULT_KEY, JSON.stringify(record));
      window.location.href = "results.html";
    });
  });

  document.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => deleteHistoryItem(button.dataset.deleteId));
  });
}

function exportHistory() {
  const history = safeJsonRead(STORAGE_KEY, []);

  if (!history.length) {
    setInlineMessage("There is no saved history to export yet.", "info");
    return;
  }

  const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "healthtriage-history.json";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setInlineMessage("Your assessment history was exported successfully.", "success");
}

function handleImportHistory(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(String(reader.result || "[]"));
      if (!Array.isArray(imported)) {
        throw new Error("Invalid history file");
      }

      const valid = imported.map((entry) => ({
        ...entry,
        id: entry.id || generateRecordId(),
        date: entry.date || new Date().toISOString(),
        symptoms: Array.isArray(entry.symptoms) ? entry.symptoms : []
      }));

      const merged = [...valid, ...safeJsonRead(STORAGE_KEY, [])].slice(0, 25);
      safeJsonWrite(STORAGE_KEY, merged);
      renderHistory();
      setInlineMessage("History imported successfully.", "success");
    } catch (error) {
      console.error("Import error:", error);
      setInlineMessage("The selected file could not be imported. Please use a valid HealthTriage JSON export.", "error");
    } finally {
      event.target.value = "";
    }
  };

  reader.readAsText(file);
}

function deleteHistoryItem(id) {
  const current = safeJsonRead(STORAGE_KEY, []);
  const next = current.filter((entry) => entry.id !== id);

  if (!safeJsonWrite(STORAGE_KEY, next)) {
    setInlineMessage("Unable to delete this item right now.", "error");
    return;
  }

  renderHistory();
  setInlineMessage("The saved assessment was deleted.", "success");
}

function resetAssessmentForm() {
  const form = document.getElementById("assessmentForm");
  if (!form) return;

  form.reset();
  showStep(1);
  setInlineMessage("A new assessment has started.", "info");
  sessionStorage.removeItem(RESULT_KEY);
  document.querySelectorAll(".field").forEach((field) => field.classList.remove("has-error"));
  document.querySelectorAll(".field-error").forEach((error) => (error.textContent = ""));
}

function handleSubmit(event) {
  event.preventDefault();

  const data = getFormData();
  if (!data) return;

  const currentStepValid = validateCurrentStep(formState.currentStep);
  if (!currentStepValid) return;

  if (!data.symptoms.length) {
    const symptomError = document.querySelector('[data-error-for="symptoms"]');
    if (symptomError) symptomError.textContent = "Please select at least one symptom.";
    setInlineMessage("Please select at least one symptom before submitting.", "error");
    return;
  }

  const triage = determineTriage(data);
  const summary = {
    id: generateRecordId(),
    ...data,
    level: triage.level,
    className: triage.className,
    date: new Date().toISOString(),
    note: data.notes || "No additional notes"
  };

  if (!saveHistory(summary)) {
    return;
  }

  sessionStorage.setItem(RESULT_KEY, JSON.stringify(summary));
  setInlineMessage("Assessment submitted and saved successfully.", "success");
  window.location.href = "results.html";
}

function initMobileNav() {
  const header = document.querySelector(".site-header .nav-wrap");
  const nav = document.querySelector(".main-nav");

  if (!header || !nav) return;
  if (header.querySelector(".nav-toggle")) return;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "nav-toggle";
  toggle.setAttribute("aria-label", "Toggle navigation menu");
  toggle.innerHTML = "☰";
  toggle.addEventListener("click", () => {
    nav.classList.toggle("open");
    toggle.classList.toggle("is-open");
  });

  header.insertBefore(toggle, nav);
}

function wireAssessmentForm() {
  const form = document.getElementById("assessmentForm");
  if (!form) return;

  const nextBtn = document.getElementById("nextBtn");
  const backBtn = document.getElementById("backBtn");
  const submitBtn = document.getElementById("submitBtn");

  if (nextBtn) nextBtn.addEventListener("click", handleNextStep);
  if (backBtn) backBtn.addEventListener("click", handlePreviousStep);
  if (submitBtn) submitBtn.addEventListener("click", handleSubmit);

  form.addEventListener("submit", handleSubmit);

  form.querySelectorAll("input, select, textarea").forEach((element) => {
    element.addEventListener("input", () => {
      const fieldName = element.name;
      if (fieldName === "symptoms" || fieldName === "warningSigns") return;
      if (fieldName === "severity") {
        const error = document.querySelector('[data-error-for="severity"]');
        if (error) error.textContent = "";
      }
      if (fieldName === "age") clearFieldError("age");
      if (fieldName === "temperature") clearFieldError("temperature");
      if (fieldName === "duration") clearFieldError("duration");
    });

    element.addEventListener("change", () => {
      if (element.name === "symptoms") {
        const symptomError = document.querySelector('[data-error-for="symptoms"]');
        if (symptomError) symptomError.textContent = "";
      }
    });
  });

  const restartBtn = document.getElementById("restartAssessmentBtn");
  if (restartBtn) {
    restartBtn.addEventListener("click", resetAssessmentForm);
  }

  showStep(1);
}

if (page === "assessment") {
  initMobileNav();
  wireAssessmentForm();
}

if (page === "results") {
  initMobileNav();
  renderResult();
}

if (page === "history") {
  initMobileNav();
  renderHistory();
}

if (page === "home" || page === "how-it-works") {
  initMobileNav();
}

initThemeToggle();
