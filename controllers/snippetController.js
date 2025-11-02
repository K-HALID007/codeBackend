import Snippet from "../models/Snippet.js";

// @desc    Get all snippets
// @route   GET /api/snippets
// @access  Public
export const getSnippets = async (req, res, next) => {
  try {
    const {
      search,
      language,
      sortBy = "createdAt",
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
    const { name, language, code, description, tags } = req.body;

    if (!name || !language || !code) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, language, and code",
      });
    }

    const snippet = await Snippet.create({
      name,
      language,
      code,
      description,
      tags,
    });

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
    const { name, language, code, description, tags } = req.body;

    let snippet = await Snippet.findById(req.params.id);

    if (!snippet) {
      return res.status(404).json({
        success: false,
        message: "Snippet not found",
      });
    }

    snippet.name = name || snippet.name;
    snippet.language = language || snippet.language;
    snippet.code = code || snippet.code;
    snippet.description =
      description !== undefined ? description : snippet.description;
    snippet.tags = tags || snippet.tags;

    await snippet.save();

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
