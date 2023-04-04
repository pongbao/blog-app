const blogsRouter = require("express").Router();
const Blog = require("../models/blog");
const User = require("../models/user");
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

module.exports = blogsRouter;
