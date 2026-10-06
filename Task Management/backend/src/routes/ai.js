import { Router } from "express";
import { z } from "zod";
import { taskPriorities } from "../models/Task.js";

export const aiRouter = Router();

const parseRequest = z.object({
  description: z.string().trim().min(10).max(2000)
});

const PRIORITY_KEYWORDS = {
  urgent: ['urgent', 'asap', 'critical', 'emergency', 'immediately', 'right now'],
  high: ['important', 'priority', 'soon', 'today', 'tomorrow'],
  medium: ['when possible', 'later', 'normal'],
  low: ['whenever', 'low priority', 'when you have time']
};

const STATUS_KEYWORDS = {
  in_progress: ['start', 'working on', 'in progress', 'doing'],
  completed: ['done', 'finished', 'completed'],
  blocked: ['blocked', 'waiting', 'stuck', 'on hold'],
  todo: ['todo', 'to do', 'need to', 'should']
};

const CATEGORY_KEYWORDS = {
  work: ['work', 'job', 'office', 'meeting', 'project', 'deadline', 'report'],
  personal: ['personal', 'home', 'family', 'health', 'doctor', 'appointment', 'errand'],
  design: ['design', 'ui', 'ux', 'mockup', 'wireframe', 'prototype', 'creative'],
  engineering: ['code', 'develop', 'program', 'bug', 'feature', 'api', 'database', 'deploy'],
  meetings: ['meeting', 'call', 'sync', 'standup', 'review', 'discussion', 'presentation'],
  planning: ['plan', 'planning', 'strategy', 'roadmap', 'outline', 'brainstorm', 'idea']
};

function extractFields(description) {
  const lowerDesc = description.toLowerCase();

  // Extract title (first sentence or first 60 chars)
  const titleMatch = description.match(/^[^.!?]*[.!?]/) || description.match(/^.{1,60}/);
  let title = titleMatch ? titleMatch[0].trim() : description.substring(0, Math.min(60, description.length)).trim();
  if (!title.endsWith('.') && !title.endsWith('!') && !title.endsWith('?')) {
    title = title + '...';
  }

  // Extract due date (simple regex for common patterns)
  let dueDate = null;
  const datePatterns = [
    /\btoday\b/i,
    /\btomorrow\b/i,
    /\bnext\s+week\b/i,
    /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/,
    /\b(\d{1,2})-(\d{1,2})-(\d{2,4})\b/,
    /\bjanuary|february|march|april|may|june|july|august|september|october|november|december\s+\d{1,2},?\s*\d{0,4}\b/i
  ];

  for (const pattern of datePatterns) {
    const match = description.match(pattern);
    if (match) {
      const matchedText = match[0].toLowerCase();
      if (matchedText.includes('today')) {
        dueDate = new Date();
        dueDate.setHours(23, 59, 59, 999);
      } else if (matchedText.includes('tomorrow')) {
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1);
        dueDate.setHours(23, 59, 59, 999);
      } else if (matchedText.includes('next week')) {
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);
        dueDate.setHours(23, 59, 59, 999);
      } else {
        // Try to parse the date
        const parsedDate = new Date(matchedText);
        if (!isNaN(parsedDate.getTime())) {
          dueDate = parsedDate;
        }
      }
      break;
    }
  }

  // Extract priority
  let priority = 'medium'; // default
  for (const [level, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword))) {
      priority = level;
      break;
    }
  }

  // Extract category
  let category = 'General'; // default
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword))) {
      category = cat.charAt(0).toUpperCase() + cat.slice(1); // Capitalize first letter
      break;
    }
  }

  // Extract status
  let status = 'todo'; // default
  for (const [stat, keywords] of Object.entries(STATUS_KEYWORDS)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword))) {
      status = stat;
      break;
    }
  }

  // Extract tags (words that start with # or are in quotes)
  const tagMatches = description.match(/(?:#|\"|')([^\s#\"']+)(?:#|\"|')/g) || [];
  const tags = [...new Set(tagMatches.map(tag => tag.replace(/^[#"']|[#"']$/g, '')))]
    .filter(tag => tag.length > 0 && tag.length <= 20)
    .slice(0, 5); // Limit to 5 tags

  return {
    title,
    description: description.trim(),
    dueDate: dueDate ? dueDate.toISOString() : null,
    priority,
    category,
    status,
    tags
  };
}

aiRouter.post("/parse-description", async (req, res) => {
  try {
    const input = parseRequest.parse(req.body);
    const parsed = extractFields(input.description);

    return res.json({
      success: true,
      data: parsed
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Invalid input"
    });
  }
});

aiRouter.get("/health", async (req, res) => {
  return res.json({ status: "ok", service: "AI Gateway" });
});

// Rewrite a task description into structured fields
aiRouter.post("/rewrite", async (req, res) => {
  try {
    const input = z.object({
      description: z.string().trim().min(10).max(2000),
      existingTitle: z.string().trim().min(1).max(140).optional(),
      existingPriority: z.enum(taskPriorities).optional(),
      existingTags: z.array(z.string()).optional(),
      existingDueDate: z.string().optional()
    }).parse(req.body);

    const parsed = extractFields(input.description);

    // Use existing values as fallbacks when AI doesn't extract them
    const result = {
      title: parsed.title || input.existingTitle || "",
      description: parsed.description,
      dueDate: parsed.dueDate || input.existingDueDate || null,
      priority: parsed.priority || input.existingPriority || "medium",
      category: parsed.category,
      status: parsed.status,
      tags: parsed.tags.length > 0 ? parsed.tags : (input.existingTags || [])
    };

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Invalid input"
    });
  }
});