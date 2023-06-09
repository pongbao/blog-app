const supertest = require("supertest");
const app = require("../app");
const api = supertest(app);
const bcrypt = require("bcrypt");

const helper = require("./test_helper");

const mongoose = require("mongoose");
const Blog = require("../models/blog");
const User = require("../models/user");

beforeAll(async () => {
  await User.deleteMany({});
  console.log("cleared");

  const userObjects = helper.initialUsers.map(async (user) => {
    const { username, name, password } = user;

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = new User({
      username,
      name,
      passwordHash,
    });

    return newUser.save();
  });

  await Promise.all(userObjects);

  console.log("users saved");
});

beforeEach(async () => {
  await Blog.deleteMany({});
  console.log("cleared");

  const blogObjects = helper.initialBlogs.map((blog) => new Blog(blog));
  const promiseArray = blogObjects.map((blog) => blog.save());
  await Promise.all(promiseArray);

  console.log("blogs saved");
});

describe("when there's some initial blogs saved", () => {
  test("all blogs are returned in json format", async () => {
    console.log("entered test");
    const response = await api
      .get("/api/blogs")
      .expect(200)
      .expect("Content-Type", /application\/json/);

    expect(response.body).toHaveLength(helper.initialBlogs.length);
  });

  test("the unique identifier of the blogs is the id", async () => {
    const response = await api.get("/api/blogs");
    expect(response.body[0].id).toBeDefined();
  });
});

describe("when adding a blog", () => {
  test("a valid blog cannot be saved if user is not logged in", async () => {
    const blogsAtStart = await helper.blogsInDb();

    const newBlog = {
      title: "Go To Statement Considered Harmful",
      author: "Edsger W. Dijkstra",
      url: "http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html",
      likes: 5,
    };

    await api.post("/api/blogs").send(newBlog).expect(401);

    const blogsAtEnd = await helper.blogsInDb();
    expect(blogsAtEnd.length).toBe(blogsAtStart.length);
  });

  test("a logged in user can save a valid blog", async () => {
    const blogsAtStart = await helper.blogsInDb();

    const user = {
      username: "pongbao",
      password: "michin-saekki",
    };

    const loginResponse = await api.post("/api/login").send(user);
    const token = JSON.parse(loginResponse.text).token;

    const newBlog = {
      title: "Go To Statement Considered Harmful",
      author: "Edsger W. Dijkstra",
      url: "http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html",
      likes: 5,
    };

    const response = await api
      .post("/api/blogs")
      .send(newBlog)
      .set("Authorization", `Bearer ${token}`)
      .expect(201)
      .expect("Content-Type", /application\/json/);

    expect(response.body.title).toBe("Go To Statement Considered Harmful");
    expect(response.body.author).toBe("Edsger W. Dijkstra");
    expect(response.body.url).toBe(
      "http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html"
    );
    expect(response.body.likes).toBe(5);

    const blogsAtEnd = await helper.blogsInDb();
    expect(blogsAtEnd.length).toBe(blogsAtStart.length + 1);
  });

  test("a blog with an empty like will default to zero", async () => {
    const user = {
      username: "pongbao",
      password: "michin-saekki",
    };

    const loginResponse = await api.post("/api/login").send(user);
    const token = JSON.parse(loginResponse.text).token;

    const newBlog = {
      title: "Go To Statement Considered Harmful",
      author: "Edsger W. Dijkstra",
      url: "http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html",
    };

    const response = await api
      .post("/api/blogs")
      .send(newBlog)
      .set("Authorization", `Bearer ${token}`)
      .expect(201)
      .expect("Content-Type", /application\/json/);

    expect(response.body.title).toBe("Go To Statement Considered Harmful");
    expect(response.body.author).toBe("Edsger W. Dijkstra");
    expect(response.body.url).toBe(
      "http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html"
    );
    expect(response.body.likes).toBe(0);
  });

  test("a blog with an empty title or url will return an error with a 400 status code", async () => {
    const user = {
      username: "pongbao",
      password: "michin-saekki",
    };

    const loginResponse = await api.post("/api/login").send(user);
    const token = JSON.parse(loginResponse.text).token;

    const untitledBlog = {
      author: "Edsger W. Dijkstra",
      url: "http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html",
    };

    await api
      .post("/api/blogs")
      .send(untitledBlog)
      .set("Authorization", `Bearer ${token}`)
      .expect(400);

    const blogWithEmptyUrl = {
      title: "Go To Statement Considered Harmful",
      author: "Edsger W. Dijkstra",
    };

    await api
      .post("/api/blogs")
      .send(blogWithEmptyUrl)
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });
});

describe("for a specific blog", () => {
  test("viewing is possible given a valid id", async () => {
    const blogsAtStart = await helper.blogsInDb();

    const blogToView = blogsAtStart[0];

    const result = await api
      .get(`/api/blogs/${blogToView.id}`)
      .expect(200)
      .expect("Content-Type", /application\/json/);

    expect(result.body).toEqual(blogToView);
  });

  test("updating is possible given a valid id", async () => {
    const blogsAtStart = await helper.blogsInDb();

    const blogToUpdate = blogsAtStart[0];
    const updatedLikes = { likes: 5 };

    await api
      .put(`/api/blogs/${blogToUpdate.id}`)
      .send(updatedLikes)
      .expect(204);

    const blogsAtEnd = await helper.blogsInDb();
    const updatedBlog = blogsAtEnd.find((blog) => blog.id === blogToUpdate.id);
    expect(updatedBlog.likes).toEqual(updatedLikes.likes);
  });

  test("using a valid but non-exising id fails with a status code of 404", async () => {
    const validNonexistingId = await helper.nonExistingId();

    await api.get(`/api/blogs/${validNonexistingId}`).expect(404);
  });

  test("using an invalid fails with a status code of 400", async () => {
    const invalidId = "5a3d5da59070081a82a3445";

    await api.get(`/api/blogs/${invalidId}`).expect(400);
  });
});

describe("deletion of a blog", () => {
  test("succeeds with status code 204 if id is valid and the user is the owner of the blog", async () => {
    await Blog.deleteMany({});

    const user = {
      username: "pongbao",
      password: "michin-saekki",
    };

    const loginResponse = await api.post("/api/login").send(user);
    const token = JSON.parse(loginResponse.text).token;

    const savedBlogs = helper.initialBlogs.map(async (blog) => {
      await api
        .post("/api/blogs")
        .send(blog)
        .set("Authorization", `Bearer ${token}`);
    });

    await Promise.all(savedBlogs);
    const blogsAtStart = await helper.blogsInDb();

    const blogToDelete = blogsAtStart[0];

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    const blogsAtEnd = await helper.blogsInDb();

    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length - 1);

    const titles = blogsAtEnd.map((r) => r.title);

    expect(titles).not.toContain(blogToDelete.title);
  });

  test("fails with status code 401 if id is valid and the user is not the owner of the blog", async () => {
    await Blog.deleteMany({});

    const user = {
      username: "pongbao",
      password: "michin-saekki",
    };

    const loginResponse = await api.post("/api/login").send(user);
    const token = JSON.parse(loginResponse.text).token;
    const savedBlogs = helper.initialBlogs.map(async (blog) => {
      await api
        .post("/api/blogs")
        .send(blog)
        .set("Authorization", `Bearer ${token}`);
    });

    await Promise.all(savedBlogs);
    const blogsAtStart = await helper.blogsInDb();

    const newUser = {
      username: "ahde",
      password: "sheesh-kafel",
    };

    const newUserLoginResponse = await api.post("/api/login").send(newUser);
    const newtoken = JSON.parse(newUserLoginResponse.text).token;

    const blogToDelete = blogsAtStart[0];

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set("Authorization", `Bearer ${newtoken}`)
      .expect(400);

    const blogsAtEnd = await helper.blogsInDb();

    expect(blogsAtEnd).toHaveLength(blogsAtStart.length);

    const titles = blogsAtEnd.map((r) => r.title);

    expect(titles).toContain(blogToDelete.title);
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});
