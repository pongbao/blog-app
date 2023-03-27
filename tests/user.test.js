const supertest = require("supertest");
const app = require("../app");
const api = supertest(app);
const bcrypt = require("bcrypt");

const helper = require("./test_helper");

const mongoose = require("mongoose");
const User = require("../models/user");

beforeEach(async () => {
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

  console.log("saved");
});

describe("when logging in", () => {
  test("using valid credentials will be successful", async () => {
    const user = {
      username: "pongbao",
      password: "michin-saekki",
    };

    await api
      .post("/api/login")
      .send(user)
      .expect(200)
      .expect("Content-Type", /application\/json/);
  });

  test("an invalid username or password will return an error", async () => {
    const user1 = {
      username: "pongbao",
      password: "michin",
    };
    await api.post("/api/login").send(user1).expect(401);

    const user2 = {
      username: "",
      password: "michin",
    };
    await api.post("/api/login").send(user2).expect(401);

    const user3 = {
      username: "pongbao",
      password: "",
    };
    await api.post("/api/login").send(user3).expect(401);
  });
});

describe("when there is initially one user in db", () => {
  beforeEach(async () => {
    await User.deleteMany({});

    const passwordHash = await bcrypt.hash("admin", 10);
    const user = new User({ username: "admin", name: "batman", passwordHash });

    await user.save();
  });

  test("creation succeeds with a valid username", async () => {
    const usersAtStart = await helper.usersInDb();

    const newUser = {
      username: "pongbao",
      name: "Zed",
      password: "michin-saekki",
    };

    await api
      .post("/api/users")
      .send(newUser)
      .expect(201)
      .expect("Content-Type", /application\/json/);

    const usersAtEnd = await helper.usersInDb();
    expect(usersAtEnd).toHaveLength(usersAtStart.length + 1);

    const usernames = usersAtEnd.map((u) => u.username);
    expect(usernames).toContain(newUser.username);
  });

  test("creation fails if username already taken", async () => {
    const usersAtStart = await helper.usersInDb();

    const newUser = {
      username: "admin",
      name: "Admin",
      password: "somepassword",
    };

    const result = await api
      .post("/api/users")
      .send(newUser)
      .expect(400)
      .expect("Content-Type", /application\/json/);

    expect(result.body.error).toContain("expected `username` to be unique");

    const usersAtEnd = await helper.usersInDb();
    expect(usersAtEnd).toEqual(usersAtStart);
  });

  test("creation fails if username is below minimum required characters", async () => {
    const usersAtStart = await helper.usersInDb();

    const newUser = {
      username: "ad",
      name: "Admin",
      password: "somepassword",
    };

    const result = await api
      .post("/api/users")
      .send(newUser)
      .expect(400)
      .expect("Content-Type", /application\/json/);

    console.log(result.body.error);

    expect(result.body.error).toContain(
      "User validation failed: username: Path `username` (`ad`) is shorter than the minimum allowed length (3)."
    );

    const usersAtEnd = await helper.usersInDb();
    expect(usersAtEnd).toEqual(usersAtStart);
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});
