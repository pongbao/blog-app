const blogsRouter = require("express").Router();
const Blog = require("../models/blog");
const User = require("../models/user");
const Comment = require("../models/comment");
const userExtractor = require("../utils/middleware").userExtractor;

blogsRouter.get("/", async (request, response) => {
  const blogs = await Blog.find({}).populate("user", {
    username: 1,
    name: 1,
  });
  response.json(blogs);
});

blogsRouter.get("/:id", async (request, response) => {
  const blog = await Blog.findById(request.params.id);

  if (blog) {
    response.json(blog);
  } else {
    response.status(404).end();
  }
});

blogsRouter.get("/:id/comments", async (request, response) => {
  const blog = await Blog.findById(request.params.id).populate("comments", {
    comment: 1,
  });

  if (blog) {
    response.json(blog.comments);
  } else {
    response.status(404).end();
  }
});

//  register a middleware only for a specific operation
blogsRouter.post("/", userExtractor, async (request, response) => {
  const body = request.body;

  const user = await User.findById(request.user);

  const newBlog = new Blog({
    title: body.title,
    author: body.author,
    url: body.url,
    likes: body.likes,
    user: user.id,
  });

  const savedBlog = await newBlog.save();
  user.blogs = user.blogs.concat(savedBlog._id);
  await user.save();

  response.status(201).json(savedBlog);
});

//  register a middleware only for a specific operation
blogsRouter.put("/:id", async (request, response) => {
  const body = request.body;

  const blog = {
    likes: body.likes,
  };

  await Blog.findByIdAndUpdate(request.params.id, blog, {
    new: true,
    runValidators: true,
    context: "query",
  });
  response.status(204).end();
});

//  register a middleware only for a specific operation
blogsRouter.delete("/:id", userExtractor, async (request, response) => {
  console.log("params", request.params);
  blogToDelete = await Blog.findById(request.params.id);

  if (blogToDelete.user.toString() === request.user) {
    await Blog.findByIdAndRemove(request.params.id);
    response.status(204).end();
  } else {
    response
      .status(400)
      .send({ error: "only the creator can delete his own blog" });
  }
});

// add comments to posts
blogsRouter.post("/:id/comments", async (request, response) => {
  const body = request.body;

  const blog = await Blog.findById(request.params.id);

  const newComment = new Comment({
    comment: body.comment,
  });

  const savedComment = await newComment.save();
  blog.comments = blog.comments.concat(savedComment._id);
  await blog.save();

  response.status(201).json(savedComment);
});

module.exports = blogsRouter;
