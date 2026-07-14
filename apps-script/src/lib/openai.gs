/**
 * Extraction structurée de champs à partir d'un document (PDF ou image) via l'API OpenAI
 * Responses, avec sortie contrainte par JSON Schema (`text.format.type = "json_schema"`).
 * Cf. ARCHITECTURE.md §7 (décision : extraction synchrone en Phase 3, pas de découpage
 * asynchrone tant qu'aucun cas réel ne dépasse le timeout de 6 min d'Apps Script).
 *
 * NON VÉRIFIÉ EN CONDITIONS RÉELLES : écrit sans accès à un compte OpenAI pour tester —
 * la forme exacte de la requête/réponse Responses API est à confirmer au premier appel réel.
 */

var EXTRACTION_PROMPT =
  "Tu extrais des informations structurées à partir d'un document administratif " +
  "(facture, courrier, formulaire...). Renseigne chaque champ demandé à partir du contenu " +
  "du document. Si une information est absente ou illisible, renvoie null pour ce champ. " +
  "N'invente aucune valeur.";

/** Point d'entrée : extrait les champs de `schema` (hors signature/checkbox) depuis un document. */
function extractFieldsFromDocument_(base64, mimeType, fileName, schema) {
  var content = buildExtractionInputContent_(base64, mimeType, fileName);
  var jsonSchema = buildExtractionJsonSchema_(schema);
  return callOpenAiResponses_(content, jsonSchema);
}

function buildExtractionInputContent_(base64, mimeType, fileName) {
  var content = [{ type: "input_text", text: EXTRACTION_PROMPT }];

  if (mimeType === "application/pdf") {
    content.push({
      type: "input_file",
      filename: fileName || "document.pdf",
      file_data: "data:application/pdf;base64," + base64,
    });
  } else if (mimeType.indexOf("image/") === 0) {
    content.push({
      type: "input_image",
      image_url: "data:" + mimeType + ";base64," + base64,
    });
  } else {
    throw new Error("Type de document non pris en charge pour l'extraction IA : " + mimeType);
  }

  return content;
}

/** Construit un schéma JSON strict (toutes les propriétés nullable mais requises) à partir de DOSSIER_SCHEMA. */
function buildExtractionJsonSchema_(schema) {
  var properties = {};
  var required = [];

  var extractable = schema.filter(function (f) {
    return f.type !== "signature" && f.type !== "checkbox";
  });

  extractable.forEach(function (field) {
    if (field.type === "select" || field.type === "radio") {
      var values = (field.options || []).map(function (o) {
        return o.value;
      });
      properties[field.name] = { type: ["string", "null"], enum: values.concat([null]) };
    } else if (field.type === "number") {
      properties[field.name] = { type: ["number", "null"] };
    } else {
      properties[field.name] = { type: ["string", "null"] };
    }
    required.push(field.name);
  });

  return {
    type: "object",
    properties: properties,
    required: required,
    additionalProperties: false,
  };
}

function callOpenAiResponses_(inputContent, jsonSchema) {
  var apiKey = PropertiesService.getScriptProperties().getProperty("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY absent des propriétés du script");

  var payload = {
    model: "gpt-4o",
    input: [{ role: "user", content: inputContent }],
    text: {
      format: {
        type: "json_schema",
        name: "extraction_dossier",
        schema: jsonSchema,
        strict: true,
      },
    },
  };

  var res = UrlFetchApp.fetch("https://api.openai.com/v1/responses", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  var status = res.getResponseCode();
  var body = JSON.parse(res.getContentText());

  if (status < 200 || status >= 300) {
    var message = (body.error && body.error.message) || res.getContentText();
    throw new Error("Erreur OpenAI (" + status + ") : " + message);
  }

  var messageOutput = (body.output || []).filter(function (o) {
    return o.type === "message";
  })[0];
  var textContent =
    messageOutput &&
    (messageOutput.content || []).filter(function (c) {
      return c.type === "output_text";
    })[0];

  if (!textContent) throw new Error("Réponse OpenAI inattendue (pas de texte de sortie)");

  return JSON.parse(textContent.text);
}
