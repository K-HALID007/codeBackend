import express from "express";
import {
  getSnippets,
  getSnippet,
  createSnippet,
  updateSnippet,
  deleteSnippet,
  getSnippetsByLanguage,
  getAllLanguages,
} from "../controllers/snippetController.js";

const router = express.Router();

// Main CRUD routes
router.route("/").get(getSnippets).post(createSnippet);

// Get all unique languages
router.get("/languages/all", getAllLanguages);

// Get snippets by language
router.get("/language/:language", getSnippetsByLanguage);

// Single snippet operations
router.route("/:id").get(getSnippet).put(updateSnippet).delete(deleteSnippet);

export default router;
