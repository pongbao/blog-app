const _ = require("lodash");

const dummy = (blogs) => {
  return 1;
};

const totalLikes = (blogs) => {
  const reducer = (sum, item) => {
    return sum + item;
  };

  const blogLikes = blogs.length === 0 ? [0] : blogs.map((blog) => blog.likes);

  return blogLikes.reduce(reducer, 0);
};

const favoriteBlog = (blogs) => {
  if (blogs.length === 0) {
    return {};
  }
  const { title, author, likes } = blogs.find(
    (blog) => blog.likes === Math.max(...blogs.map((blog) => blog.likes))
  );

  return {
    title: title,
    author: author,
    likes: likes,
  };
};

const mostBlogs = (blogs) => {
  if (blogs.length === 0) {
    return {};
  } else if (blogs.length === 1) {
    return {
      author: blogs[0].author,
      blogs: 1,
    };
  }

  const topAuthorCount = _.maxBy(
    Object.entries(_.countBy(blogs, "author")),
    ([key, value]) => value
  );

  return {
    author: topAuthorCount[0],
    blogs: topAuthorCount[1],
  };
};

const mostLikes = (blogs) => {
  const reducer = (sum, item) => {
    return sum + item;
  };

  if (blogs.length === 0) {
    return {};
  } else if (blogs.length === 1) {
    return {
      author: blogs[0].author,
      likes: blogs[0].likes,
    };
  }

  const authors = _.uniq(_.map(blogs, "author"));
  const likes = _.map(authors, (author) =>
    _.reduce(
      _.map(blogs, (blog) => {
        return blog.author === author ? blog.likes : 0;
      }),
      reducer,
      0
    )
  );

  const topAuthorLikes = _.maxBy(
    _.zip(authors, likes),
    ([key, value]) => value
  );

  return {
    author: topAuthorLikes[0],
    likes: topAuthorLikes[1],
  };
};

module.exports = { dummy, totalLikes, favoriteBlog, mostBlogs, mostLikes };
