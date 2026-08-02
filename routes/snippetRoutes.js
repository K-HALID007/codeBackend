import express from "express";
import {
  getSnippets,
  getSnippet,
  createSnippet,
  updateSnippet,
  deleteSnippet,
  getSnippetsByLanguage,
  getAllLanguages,
  renameFolder,
  verifySnippetPin,
} from "../controllers/snippetController.js";

const router = express.Router();

// Main CRUD routes
router.route("/").get(getSnippets).post(createSnippet);

// Get all unique languages
router.get("/languages/all", getAllLanguages);

// Get snippets by language
router.get("/language/:language", getSnippetsByLanguage);

// Rename folder
router.put("/folder/rename", renameFolder);

// Snippet specific routes
router
  .route("/:id")
  .get(getSnippet)
  .put(updateSnippet)
  .delete(deleteSnippet);

// Verify PIN
router.post("/:id/verify-pin", verifySnippetPin);

export default router;
