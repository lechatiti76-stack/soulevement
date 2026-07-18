/**
 * Extraction OCR ponctuelle d'un seul champ (ex. numéro de conteneur/wagon photographié
 * sur le terrain, module "soulevement"). Réutilise lib/openai.gs mais avec un schéma JSON
 * minimal `{numero}` au lieu du schéma complet DOSSIER_SCHEMA. Stateless : ne persiste rien,
 * ne crée aucune ligne en base — contrairement à dossiers.extractIA (extraction complète
 * rattachée à un dossier). Cf. ARCHITECTURE.md §7.
 */

var NUMERO_JSON_SCHEMA = {
  type: "object",
  properties: {
    numero: { type: ["string", "null"] },
  },
  required: ["numero"],
  additionalProperties: false,
};

var NUMERO_EXTRACTION_PROMPT =
  "Tu extrais un numéro d'identification (conteneur ou wagon ferroviaire) visible sur cette " +
  "photo. Renvoie uniquement le numéro tel qu'il apparaît (lettres et chiffres, sans espaces " +
  "superflus). Si aucun numéro n'est lisible, renvoie null. N'invente aucune valeur.";

function ocrHandlers_() {
  return {
    "fields.extractSingle": fieldsExtractSingle_,
  };
}

function fieldsExtractSingle_(body) {
  requireAuth_(body);

  if (!body.imageBase64 || !body.mimeType) {
    throw new Error("Image requise (imageBase64, mimeType)");
  }
  if (body.mimeType.indexOf("image/") !== 0) {
    throw new Error("Type de fichier non pris en charge pour l'OCR : " + body.mimeType);
  }

  var content = [
    { type: "input_text", text: NUMERO_EXTRACTION_PROMPT },
    { type: "input_image", image_url: "data:" + body.mimeType + ";base64," + body.imageBase64 },
  ];

  var result = callOpenAiResponses_(content, NUMERO_JSON_SCHEMA);
  return { numero: result.numero || null };
}
