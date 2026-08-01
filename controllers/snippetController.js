import Snippet from "../models/Snippet.js";

// @desc    Get all snippets
// @route   GET /api/snippets
// @access  Public
export const getSnippets = async (req, res, next) => {
  try {
    const {
      search,
      language,
      sortBy = "updatedAt",
      order = "desc",
    } = req.query;

    let query = {};

    // Search functionality
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { language: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { tags: { $regex: search, $options: "i" } },
        ],
      };
    }

    // Filter by language
    if (language) {
      query.language = { $regex: language, $options: "i" };
    }

    // Sorting
    const sortOrder = order === "asc" ? 1 : -1;
    const sortOptions = { [sortBy]: sortOrder };

    const snippets = await Snippet.find(query).sort(sortOptions);

    res.status(200).json({
      success: true,
      count: snippets.length,
      data: snippets,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single snippet by ID
// @route   GET /api/snippets/:id
// @access  Public
export const getSnippet = async (req, res, next) => {
  try {
    const snippet = await Snippet.findById(req.params.id);

    if (!snippet) {
      return res.status(404).json({
        success: false,
        message: "Snippet not found",
      });
    }

    res.status(200).json({
      success: true,
      data: snippet,
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Snippet not found",
      });
    }
    next(error);
  }
};

// @desc    Create new snippet
// @route   POST /api/snippets
// @access  Public
export const createSnippet = async (req, res, next) => {
  try {
    const {
      name,
      language = "javascript",
      code = "",
      description = "",
      folder = "",
      tags = [],
    } = req.body;

    // Only name is required
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide snippet name",
      });
    }

    const snippet = await Snippet.create({
      name: name.trim(),
      language,
      code,
      description,
      folder,
      tags,
    });

    // 🔥 This response will trigger the Socket.IO middleware
    res.status(201).json({
      success: true,
      message: "Snippet created successfully",
      data: snippet,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update snippet
// @route   PUT /api/snippets/:id
// @access  Public
export const updateSnippet = async (req, res, next) => {
  try {
    const { name, language, code, description, folder, tags } = req.body;

    let snippet = await Snippet.findById(req.params.id);

    if (!snippet) {
      return res.status(404).json({
        success: false,
        message: "Snippet not found",
      });
    }

    // Update fields if provided
    if (name !== undefined) snippet.name = name;
    if (language !== undefined) snippet.language = language;
    if (code !== undefined) snippet.code = code;
    if (description !== undefined) snippet.description = description;
    if (folder !== undefined) snippet.folder = folder;
    if (tags !== undefined) snippet.tags = tags;

    await snippet.save();

    // 🔥 This response will trigger the Socket.IO middleware
    res.status(200).json({
      success: true,
      message: "Snippet updated successfully",
      data: snippet,
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Snippet not found",
      });
    }
    next(error);
  }
};

// @desc    Delete snippet
// @route   DELETE /api/snippets/:id
// @access  Public
export const deleteSnippet = async (req, res, next) => {
  try {
    const snippet = await Snippet.findById(req.params.id);

    if (!snippet) {
      return res.status(404).json({
        success: false,
        message: "Snippet not found",
      });
    }

    await snippet.deleteOne();

    // 🔥 This response will trigger the Socket.IO middleware
    res.status(200).json({
      success: true,
      message: "Snippet deleted successfully",
      data: {},
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Snippet not found",
      });
    }
    next(error);
  }
};

// @desc    Get snippets by language
// @route   GET /api/snippets/language/:language
// @access  Public
export const getSnippetsByLanguage = async (req, res, next) => {
  try {
    const snippets = await Snippet.find({
      language: { $regex: req.params.language, $options: "i" },
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: snippets.length,
      data: snippets,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all unique languages
// @route   GET /api/snippets/languages/all
// @access  Public
export const getAllLanguages = async (req, res, next) => {
  try {
    const languages = await Snippet.distinct("language");

    res.status(200).json({
      success: true,
      count: languages.length,
      data: languages,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Rename a folder (bulk update snippets)
// @route   PUT /api/snippets/folder/rename
// @access  Public
export const renameFolder = async (req, res, next) => {
  try {
    const { oldName, newName } = req.body;

    if (!oldName || newName === undefined) {
      return res.status(400).json({
        success: false,
        message: "Please provide both oldName and newName",
      });
    }

    // Update all snippets that have the old folder name
    const result = await Snippet.updateMany(
      { folder: oldName },
      { $set: { folder: newName.trim() } }
    );

    // Instead of letting the generic middleware emit a generic event, 
    // we send back a specific response that our middleware will catch and broadcast.
    res.status(200).json({
      success: true,
      message: `Folder renamed successfully. ${result.modifiedCount} snippets updated.`,
      data: { oldName, newName: newName.trim(), modifiedCount: result.modifiedCount },
      isFolderRename: true // Flag for socket middleware
    });
  } catch (error) {
    next(error);
  }
};
