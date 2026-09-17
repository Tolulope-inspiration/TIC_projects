(() => {
  "use strict";

  // ==========================================
  // DOM elements
  // ==========================================
  const form = document.getElementById("triage-form");

  if (!form) {
    return;
  }

  const ageInput = document.getElementById("age");
  const temperatureInput = document.getElementById("temperature");
  const durationInput = document.getElementById("duration");
  const symptomCheckboxes = Array.from(document.querySelectorAll('input[name="symptoms"]'));
  const resultPanel = document.querySelector(".results-panel");
  const modeToggle = document.getElementById("mode-toggle");

  function applyTheme(theme) {
    const isDark = theme === "dark";
    document.body.dataset.theme = isDark ? "dark" : "light";

    if (modeToggle) {
      modeToggle.setAttribute("aria-pressed", String(isDark));
      modeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
      const label = modeToggle.querySelector(".mode-label");
      if (label) {
        label.textContent = isDark ? "Light mode" : "Dark mode";
      }
    }
  }

  applyTheme(localStorage.getItem("healthtriage-theme") || "light");

  modeToggle?.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("healthtriage-theme", nextTheme);
    applyTheme(nextTheme);
  });

  function getCurrentResultNode() {
    if (!resultPanel) {
      return null;
    }

    return resultPanel.querySelector(".result-empty, .result-loading, .result-content");
  }

  const fieldMap = {
    age: ageInput?.closest(".field"),
    temperature: temperatureInput?.closest(".field"),
    duration: durationInput?.closest(".field")
  };

  const symptomLabelMap = {
    fever: "Fever",
    cough: "Cough",
    fatigue: "Weakness or fatigue",
    headache: "Headache",
    vomiting: "Vomiting",
    diarrhoea: "Diarrhoea",
    breathing: "Shortness of breath",
    "chest-pain": "Chest pain"
  };

  const durationLabelMap = {
    "less-than-24h": "Less than 24 hours",
    "1-3-days": "1 to 3 days",
    "4-7-days": "4 to 7 days",
    "more-than-7-days": "More than 7 days",
    "several-weeks": "Several weeks"
  };

  // ==========================================
  // Form handling
  // ==========================================
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = collectFormData();
    const validationResult = validateFormData(formData);

    if (!validationResult.isValid) {
      renderValidationErrors(validationResult.errors);
      return;
    }

    clearValidationErrors();
    renderLoadingState();

    window.setTimeout(() => {
      const assessment = generateAssessment(formData);
      renderAssessment(assessment);
    }, 750);
  });

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      clearValidationErrors();
      renderEmptyState();
    }, 0);
  });

  // ==========================================
  // Input validation
  // ==========================================
  function collectFormData() {
    const selectedSymptoms = normalizeSymptoms(getSelectedSymptoms());

    return {
      age: Number.parseFloat(ageInput.value),
      temperature: Number.parseFloat(temperatureInput.value),
      duration: durationInput.value,
      symptoms: selectedSymptoms,
      notes: document.getElementById("other-symptoms")?.value.trim() || ""
    };
  }

  function getSelectedSymptoms() {
    return symptomCheckboxes
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);
  }

  function normalizeSymptoms(symptomValues) {
    const uniqueSymptoms = new Set();

    symptomValues.forEach((value) => {
      const normalizedValue = String(value).trim();
      if (normalizedValue) {
        uniqueSymptoms.add(normalizedValue);
      }
    });

    return Array.from(uniqueSymptoms);
  }

  function validateFormData(formData) {
    const errors = {};

    if (!Number.isFinite(formData.age) || formData.age <= 0 || formData.age > 120) {
      errors.age = "Please enter a valid age between 1 and 120 years.";
    }

    if (!Number.isFinite(formData.temperature) || formData.temperature < 34 || formData.temperature > 45) {
      errors.temperature = "Please enter a body temperature between 34°C and 45°C.";
    }

    if (!formData.symptoms || formData.symptoms.length === 0) {
      errors.symptoms = "Please select at least one symptom to continue.";
    }

    if (!formData.duration) {
      errors.duration = "Please tell us how long the symptoms have been present.";
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  function renderValidationErrors(errors) {
    clearValidationErrors();

    if (errors.age) {
      showFieldError("age", errors.age);
    }

    if (errors.temperature) {
      showFieldError("temperature", errors.temperature);
    }

    if (errors.duration) {
      showFieldError("duration", errors.duration);
    }

    if (errors.symptoms) {
      showSymptomError(errors.symptoms);
    }

    const firstErrorField = document.querySelector(".field.has-error input, .field.has-error select, .field.has-error textarea, .symptom-fieldset.has-error");

    if (firstErrorField) {
      firstErrorField.focus();
    }
  }

  function showFieldError(fieldName, message) {
    const field = fieldMap[fieldName];

    if (!field) {
      return;
    }

    field.classList.add("has-error");

    let errorElement = field.querySelector(".error-message");
    if (!errorElement) {
      errorElement = document.createElement("div");
      errorElement.className = "error-message";
      field.appendChild(errorElement);
    }

    errorElement.textContent = message;
    const input = field.querySelector("input, select, textarea");
    if (input) {
      input.setAttribute("aria-invalid", "true");
    }
  }

  function showSymptomError(message) {
    const fieldset = document.querySelector(".symptom-fieldset");
    if (!fieldset) {
      return;
    }

    fieldset.classList.add("has-error");

    let errorElement = fieldset.querySelector(".error-message");
    if (!errorElement) {
      errorElement = document.createElement("div");
      errorElement.className = "error-message";
      fieldset.appendChild(errorElement);
    }

    errorElement.textContent = message;
  }

  function clearValidationErrors() {
    Object.keys(fieldMap).forEach((fieldName) => {
      const field = fieldMap[fieldName];
      if (!field) {
        return;
      }

      field.classList.remove("has-error");
      const errorElement = field.querySelector(".error-message");
      if (errorElement) {
        errorElement.textContent = "";
      }

      const input = field.querySelector("input, select, textarea");
      if (input) {
        input.removeAttribute("aria-invalid");
      }
    });

    const fieldset = document.querySelector(".symptom-fieldset");
    if (fieldset) {
      fieldset.classList.remove("has-error");
      const symptomError = fieldset.querySelector(".error-message");
      if (symptomError) {
        symptomError.textContent = "";
      }
    }
  }

  // ==========================================
  // Symptom normalization
  // ==========================================
  function formatSymptomsForDisplay(symptoms) {
    return symptoms.map((symptom) => symptomLabelMap[symptom] || symptom);
  }

  // ==========================================
  // Safety checks
  // ==========================================
  function detectEmergencySignals(formData) {
    const { symptoms, temperature, age } = formData;
    const symptomSet = new Set(symptoms);
    const alerts = [];

    if (symptomSet.has("breathing") || symptomSet.has("chest-pain")) {
      alerts.push("Breathing difficulty or chest pain is a significant warning sign and should prompt urgent clinical review.");
    }

    if (temperature >= 40.5) {
      alerts.push("A very high temperature may indicate a serious illness and needs urgent evaluation.");
    }

    if (age <= 5 && temperature >= 38.5) {
      alerts.push("High fever in a young child warrants prompt medical review.");
    }

    if (symptomSet.has("vomiting") && formData.duration === "more-than-7-days") {
      alerts.push("Persistent vomiting for more than a week needs professional review.");
    }

    return alerts;
  }

  // ==========================================
  // Triage logic
  // ==========================================
  function generateAssessment(formData) {
    const emergencyAlerts = detectEmergencySignals(formData);
    const selectedSymptoms = formatSymptomsForDisplay(formData.symptoms);
    const durationText = durationLabelMap[formData.duration] || formData.duration;

    if (emergencyAlerts.length > 0) {
      return {
        category: "Emergency attention",
        level: "urgent",
        title: "Emergency attention is recommended.",
        summary: "This rule-based prototype strongly suggests that urgent clinical assessment is appropriate because the reported symptoms include warning signs that can escalate quickly.",
        reasons: buildReasonList(formData, selectedSymptoms, durationText, emergencyAlerts),
        action: "Please seek urgent medical care immediately or contact your nearest emergency service. If the patient is in distress, call emergency support without delay.",
        disclaimer: "This prototype is not a diagnosis and does not replace a qualified clinician or emergency assessment.",
        explanation: buildEducationalExplanation(formData, "urgent")
      };
    }

    const moderateSignals = evaluateModerateSignals(formData);

    if (moderateSignals.length > 0) {
      return {
        category: "Seek medical attention soon",
        level: "monitor",
        title: "Medical review is recommended soon.",
        summary: "The reported symptoms are concerning enough to merit early professional assessment, especially if they persist or worsen.",
        reasons: buildReasonList(formData, selectedSymptoms, durationText, moderateSignals),
        action: "Please arrange a timely review with a qualified healthcare provider or clinic. Continue monitoring the person closely.",
        disclaimer: "This prototype is not a diagnosis and does not replace a medical professional.",
        explanation: buildEducationalExplanation(formData, "monitor")
      };
    }

    return {
      category: "Monitor symptoms and consider professional advice",
      level: "low-risk",
      title: "Symptoms appear manageable for now, but they should still be watched.",
      summary: "The reported symptoms are not currently meeting the higher-risk thresholds in this prototype, but persistent or worsening symptoms should still be reviewed by a clinician.",
      reasons: buildReasonList(formData, selectedSymptoms, durationText, [
        "The symptom pattern does not currently trigger a higher-risk emergency threshold in this prototype.",
        "Temperature and symptom duration are within the lower-risk range for this rule set."
      ]),
      action: "Monitor the person closely, encourage hydration and rest, and seek professional advice if symptoms worsen, last longer than expected, or new warning signs appear.",
      disclaimer: "This prototype is not a diagnosis and does not replace a qualified healthcare professional.",
      explanation: buildEducationalExplanation(formData, "low-risk")
    };
  }

  function evaluateModerateSignals(formData) {
    const { symptoms, temperature, duration } = formData;
    const symptomSet = new Set(symptoms);
    const signals = [];

    if (temperature >= 38.0) {
      signals.push("Temperature is elevated.");
    }

    if (symptomSet.has("vomiting") || symptomSet.has("diarrhoea")) {
      signals.push("Gastrointestinal symptoms are present.");
    }

    if (symptomSet.has("fatigue") || symptomSet.has("headache") || symptomSet.has("cough")) {
      signals.push("Multiple symptoms are being reported at the same time.");
    }

    if (duration === "4-7-days" || duration === "more-than-7-days" || duration === "several-weeks") {
      signals.push("Symptoms have been present for several days or more.");
    }

    return signals;
  }

  function buildReasonList(formData, selectedSymptoms, durationText, signals) {
    const reasons = [
      `Age: ${formData.age} years`,
      `Temperature: ${formData.temperature}°C`,
      `Symptoms reported: ${selectedSymptoms.join(", ") || "No symptom selected"}`,
      `Duration: ${durationText}`
    ];

    signals.forEach((signal) => {
      reasons.push(signal);
    });

    if (formData.notes) {
      reasons.push(`Additional notes: ${formData.notes}`);
    }

    return reasons;
  }

  function buildEducationalExplanation(formData, level) {
    const symptoms = formatSymptomsForDisplay(formData.symptoms).join(", ");
    const concern = formData.symptoms.includes("breathing") || formData.symptoms.includes("chest-pain")
      ? "The main concern is that breathing difficulty or chest pain can affect vital body functions and needs prompt professional assessment."
      : formData.symptoms.includes("vomiting") || formData.symptoms.includes("diarrhoea")
        ? "The main concern is fluid loss and dehydration, especially if the symptoms continue or the person cannot keep fluids down."
        : formData.temperature >= 38
          ? "The main concern is that an elevated temperature can occur with infection or inflammation, so changes over time matter."
          : "The selected symptoms may reflect a short-term health problem, but their cause cannot be established safely from this form alone.";

    const urgency = level === "urgent"
      ? "Because warning signs were selected, do not wait for an online explanation before seeking urgent care."
      : level === "monitor"
        ? "Because several concerns were reported together, a clinician can assess the full picture and decide whether testing or treatment is needed."
        : "If the symptoms worsen, persist, or new warning signs appear, seek advice from a qualified healthcare professional.";

    return `Based on the answers (${symptoms}), this educational explainer highlights the following health concern: ${concern} ${urgency} This is general information, not a diagnosis or a statement that you have a particular illness.`;
  }

  // ==========================================
  // Result rendering
  // ==========================================
  function renderLoadingState() {
    const currentNode = getCurrentResultNode();

    const loadingMarkup = `
      <div class="result-loading" aria-live="polite" role="status">
        <span class="spinner" aria-hidden="true"></span>
        <span>Assessing symptoms against the prototype triage rules...</span>
      </div>
    `;

    if (currentNode) {
      currentNode.outerHTML = loadingMarkup;
      return;
    }

    if (resultPanel) {
      resultPanel.insertAdjacentHTML("beforeend", loadingMarkup);
    }
  }

  function renderAssessment(assessment) {
    const currentNode = getCurrentResultNode();

    const resultMarkup = `
      <div class="result-content" aria-live="polite">
        <div class="result-status ${assessment.level}">${assessment.category}</div>
        <div class="result-summary">
          <h3>${assessment.title}</h3>
          <p>${assessment.summary}</p>
        </div>
        <div class="ai-explainer">
          <p class="card-label">AI health explainer</p>
          <h3>What this result may mean</h3>
          <p>${assessment.explanation}</p>
        </div>
        <div class="result-score">
          <strong>${assessment.category}</strong>
        </div>
        <div>
          <h3>Why this recommendation was produced</h3>
          <ul>
            ${assessment.reasons.map((reason) => `<li>${reason}</li>`).join("")}
          </ul>
        </div>
        <div>
          <h3>Recommended next step</h3>
          <p>${assessment.action}</p>
        </div>
        <div class="muted">
          <strong>Prototype note:</strong> ${assessment.disclaimer}
        </div>
      </div>
    `;

    if (currentNode) {
      currentNode.outerHTML = resultMarkup;
      return;
    }

    if (resultPanel) {
      resultPanel.insertAdjacentHTML("beforeend", resultMarkup);
    }
  }

  function renderEmptyState() {
    if (!resultPanel) {
      return;
    }

    resultPanel.innerHTML = `
      <div class="panel-header">
        <p class="section-tag">Assessment result</p>
        <h2>Your results will appear here</h2>
      </div>
      <div class="result-empty" aria-live="polite">
        <p class="empty-title">No assessment yet</p>
        <p>Complete the form to receive a preliminary triage summary and guidance for follow-up care.</p>
        <p class="muted">This area is reserved for AI-generated risk prompting and clinical safety messaging.</p>
      </div>
    `;
  }

  // ==========================================
  // Utility functions
  // ==========================================
  function resetFormState() {
    clearValidationErrors();
    renderEmptyState();
  }

  // Optional safety hook for early interaction checks.
  ageInput?.addEventListener("input", () => {
    if (ageInput.value) {
      clearValidationErrors();
    }
  });

  temperatureInput?.addEventListener("input", () => {
    if (temperatureInput.value) {
      clearValidationErrors();
    }
  });

  durationInput?.addEventListener("change", () => {
    clearValidationErrors();
  });

  symptomCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const fieldset = document.querySelector(".symptom-fieldset");
      if (fieldset) {
        fieldset.classList.remove("has-error");
        const symptomError = fieldset.querySelector(".error-message");
        if (symptomError) {
          symptomError.textContent = "";
        }
      }
    });
  });

  renderEmptyState();
})();
