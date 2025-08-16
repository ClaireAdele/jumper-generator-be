const app = require("../../app");
const request = require("supertest");
const mongoose = require("mongoose");

const User = require("../../models/users");
const Pattern = require("../../models/patterns");

const { hashPassword } = require("../../utils/encryption_utils");
const { generateToken } = require("../../utils/jwt_token_utils");
require("../../mongodb_helper");


describe("TESTS FOR /patterns ENDPOINT", () => {
  describe("POST - savePattern", () => {
    let token;
    let user;
    let userId;
    let cookie;

    beforeEach(async () => {
      user = new User({
        username: "testUser",
        email: "test@email.com",
        password: "password",
      });

      await user.save();
      token = generateToken(user._id);
      userId = user._id;
      cookie = `token=${token}; HttpOnly; Path=/; Secure`;
    });

    afterEach(async () => {
      await User.deleteMany();
      await Pattern.deleteMany();
    });
        
    test("When the user and pattern name are valid, a pattern is savec in the database", async () => {
      const response = await request(app)
        .post("/api/patterns")
        .set("Cookie", cookie)
        .send({
          chestCircumference: 10,
          armLength: 10,
          knittingGauge: 10,
          bodyLength: 10,
          easeAmount: 7,
          preferredUnit: "centimetre",
          patternName: "Blue Jumper",
          jumperShape: "top-down-raglan",
        });
            
      expect(response.statusCode).toBe(201);
      expect(response.body).toMatchObject({
        message: `Pattern ${response.body.pattern._id} has been created`,
        pattern: {
          knittingGauge: 10,
          patternName: "Blue Jumper",
          user: userId.toString(),
          chestCircumference: 10,
          armLength: 10,
          bodyLength: 10,
          easeAmount: 7,
          preferredUnit: "centimetre",
          jumperShape: "top-down-raglan",
        },
      });

      const pattern = await Pattern.findById({
        _id: response.body.pattern._id,
      });
          
      expect(pattern).toBeTruthy();
    });

    test("If the user is not logged in with a valid token, the server returns an authentication error", async () => {
      const response = await request(app).post("/api/patterns").send({
        chestCircumference: 10,
        armLength: 10,
        bodyLength: 10,
        knittingGauge: 10,
        easeAmount: 7,
        preferredUnit: "centimetre",
        patternName: "Blue Jumper",
        jumperShape: "top-down-raglan",
      });

      expect(response.body).toEqual({ message: "Could not verify token" });
      expect(response.statusCode).toBe(401)

      const count = await Pattern.countDocuments();
      expect(count).toBe(0);
    });

    test("If the user does not exist in the database, the server responds with an error", async () => {
      await User.findByIdAndDelete({ _id: userId });
           
      const response = await request(app)
        .post("/api/patterns")
        .set("Cookie", cookie)
        .send({
          knittingGauge: 10,
          chestCircumference: 10,
          armLength: 10,
          bodyLength: 10,
          easeAmount: 7,
          preferredUnit: "centimetre",
          patternName: "Blue Jumper",
          jumperShape: "top-down-raglan",
        });


      expect(response.body).toEqual({ message: "User not found" });
      expect(response.statusCode).toBe(404);

      const count = await Pattern.countDocuments();
      expect(count).toBe(0);
    });

    test("If there is no pattern name, the server responds with an error and doesn't save a pattern in the dabatase", async () => {
      const response = await request(app)
        .post("/api/patterns")
        .set("Cookie", cookie)
        .send({
          knittingGauge: 10,
          chestCircumference: 10,
          armLength: 10,
          bodyLength: 10,
          easeAmount: 7,
          preferredUnit: "centimetre",
          jumperShape: "top-down-raglan",
        });
            
      expect(response.body).toEqual({ message: "Missing required field: patternName" });
      expect(response.statusCode).toBe(400);

      const count = await Pattern.countDocuments();
      expect(count).toBe(0);
    });


    test("If there is no jumper shape, the server responds with an error and doesn't save a pattern in the dabatase", async () => {
      const response = await request(app)
        .post("/api/patterns")
        .set("Cookie", cookie)
        .send({
          knittingGauge: 10,
          chestCircumference: 10,
          armLength: 10,
          bodyLength: 10,
          easeAmount: 7,
          patternName: "Blue Jumper",
          preferredUnit: "centimetre",
        });

      expect(response.body).toEqual({
        message: "Missing required field: jumperShape",
      });
      expect(response.statusCode).toBe(400);

      const count = await Pattern.countDocuments();
      expect(count).toBe(0);
    });

    test("If there is no knitting gauge, the server responds with an error and doesn't save a pattern in the dabatase", async () => {
      const response = await request(app)
        .post("/api/patterns")
        .set("Cookie", cookie)
        .send({
          chestCircumference: 10,
          armLength: 10,
          bodyLength: 10,
          easeAmount: 7,
          patternName: "Blue Jumper",
          preferredUnit: "centimetre",
          jumperShape: "top-down-raglan",
        });

      expect(response.body).toEqual({
        message: "Missing required field: knittingGauge",
      });
      expect(response.statusCode).toBe(400);

      const count = await Pattern.countDocuments();
      expect(count).toBe(0);
    });

    test("If a measurement field is missing from the request for a particular shape, throw an error - TOP-DOWN-RAGLAN", async () => {
      const response = await request(app)
        .post("/api/patterns")
        .set("Cookie", cookie)
        .send({
          knittingGauge: 10,
          chestCircumference: 10,
          bodyLength: 10,
          easeAmount: 7,
          preferredUnit: "centimetre",
          patternName: "Blue Jumper",
          jumperShape: "top-down-raglan",
        });

      expect(response.body).toEqual({
        message: "Incorrect jumper data - try again",
      });
      expect(response.statusCode).toBe(400);

      const count = await Pattern.countDocuments();
      expect(count).toBe(0);
    });

    test("If a measurement field is missing from the request for a particular shape, throw an error - BOTTOM-UP", async () => {
      const response = await request(app)
        .post("/api/patterns")
        .set("Cookie", cookie)
        .send({
          knittingGauge: 10,
          chestCircumference: 10,
          bodyLength: 10,
          easeAmount: 7,
          preferredUnit: "centimetre",
          patternName: "Blue Jumper",
          jumperShape: "bottom-up",
        });

      expect(response.body).toEqual({
        message: "Incorrect jumper data - try again",
      });
      expect(response.statusCode).toBe(400);

      const count = await Pattern.countDocuments();
      expect(count).toBe(0);
    });

    test("If a measurement field is missing from the request for a particular shape, throw an error - DROP-SHOULDER", async () => {
      const response = await request(app)
        .post("/api/patterns")
        .set("Cookie", cookie)
        .send({
          knittingGauge: 10,
          chestCircumference: 10,
          bodyLength: 10,
          easeAmount: 7,
          preferredUnit: "centimetre",
          patternName: "Blue Jumper",
          jumperShape: "drop-shoulder",
        });

      expect(response.body).toEqual({
        message: "Incorrect jumper data - try again",
      });
      expect(response.statusCode).toBe(400);

      const count = await Pattern.countDocuments();
      expect(count).toBe(0);
    });

    test("If the jumper shape is not in the currently supported list, throw an error", async () => {
      const response = await request(app)
        .post("/api/patterns")
        .set("Cookie", cookie)
        .send({
          knittingGauge: 10,
          chestCircumference: 10,
          bodyLength: 10,
          easeAmount: 7,
          preferredUnit: "centimetre",
          patternName: "Blue Jumper",
          jumperShape: "not-supported",
        });

      expect(response.body).toEqual({
        message: "Incorrect jumper data - try again",
      });
      expect(response.statusCode).toBe(400);

      const count = await Pattern.countDocuments();
      expect(count).toBe(0);
    });
      
    test("If any of the required measurement fields is set to 0, throw an error, even if no field is missing", async () => {
      const response = await request(app)
        .post("/api/patterns")
        .set("Cookie", cookie)
        .send({
          knittingGauge: 10,
          chestCircumference: 10,
          bodyLength: 10,
          armLength: 0,
          easeAmount: 7,
          preferredUnit: "centimetre",
          patternName: "Blue Jumper",
          jumperShape: "top-down-raglan",
        });

      expect(response.body).toEqual({
        message: "Incorrect jumper data - try again",
      });
      expect(response.statusCode).toBe(400);

      const count = await Pattern.countDocuments();
      expect(count).toBe(0);
    });

    test("If any of the required measurement fields is set a falsy value, throw an error, even if no field is missing", async () => {
      const response = await request(app)
        .post("/api/patterns")
        .set("Cookie", cookie)
        .send({
          knittingGauge: 10,
          chestCircumference: 10,
          bodyLength: 10,
          armLength: undefined,
          easeAmount: 7,
          preferredUnit: "centimetre",
          patternName: "Blue Jumper",
          jumperShape: "top-down-raglan",
        });

      expect(response.body).toEqual({
        message: "Incorrect jumper data - try again",
      });
      expect(response.statusCode).toBe(400);

      const count = await Pattern.countDocuments();
      expect(count).toBe(0);
    });

    test("If any of the required measurement fields is set to a data type other than number, throw an error, even if no field is missing", async () => {
      const response = await request(app)
        .post("/api/patterns")
        .set("Cookie", cookie)
        .send({
          knittingGauge: 10,
          chestCircumference: 10,
          bodyLength: 10,
          armLength: "0",
          easeAmount: 7,
          preferredUnit: "centimetre",
          patternName: "Blue Jumper",
          jumperShape: "top-down-raglan",
        });

      expect(response.body).toEqual({
        message: "Incorrect jumper data - try again",
      });
      expect(response.statusCode).toBe(400);

      const count = await Pattern.countDocuments();
      expect(count).toBe(0);
    });
  });

  describe("GET - getPatternById", () => {
    let token;
    let user;
    let userId;
    let cookie;
    let pattern;

    beforeEach(async () => {
      user = new User({
        username: "testUser",
        email: "test@email.com",
        password: "password",
      });

      pattern = new Pattern({
        jumperShape: "top-down-raglan",
        chestCircumference: 10,
        armLength: 10,
        bodyLength: 10,
        easeAmount: 10,
        knittingGauge: 10,
        patternName: "Test Pattern",
        user: new mongoose.Types.ObjectId(user._id),
      });

      await user.save();
      await pattern.save();
      token = generateToken(user._id);
      userId = user._id;
      cookie = `token=${token}; HttpOnly; Path=/; Secure`;
    });

    afterEach(async () => {
      await User.deleteMany();
      await Pattern.deleteMany();
    });

    test("When the params are set correctly to an existing pattern, and the user is logged in, the server responds with a sucess message and the pattern data", async () => {
      const response = await request(app)
        .get(`/api/patterns/${pattern._id}`)
        .set("Cookie", cookie)
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: `Pattern ${pattern._id} found`,
        pattern: {
          _id: pattern._id.toString(),
          patternName: "Test Pattern",
          user: user._id.toString(),
          jumperShape: "top-down-raglan",
          easeAmount: 10,
          knittingGauge: 10,
          chestCircumference: 10,
          armLength: 10,
          bodyLength: 10,
          __v: 0,
        },
      });
    });

    test("If the user is not logged in, then the server responds with 401 - 'Could not verify token'", async () => {
      const response = await request(app)
        .get(`/api/patterns/${pattern._id}`)
      
      expect(response.body).toEqual({
        message: "Could not verify token"
      });
    });

    test("If there no pattern with that id, the server should return 404 - not found", async () => {
      const nonExistentPatternId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/patterns/${nonExistentPatternId}`)
        .set("Cookie", cookie);
      
      expect(response.body).toEqual({ message: "Pattern does not exist" });
      expect(response.status).toBe(404);
    });

    test("If there the id is malformed, the error should be caught by the mongoose error global handler", async () => {
      const response = await request(app)
        .get(`/api/patterns/malformedId`)
        .set("Cookie", cookie);

      expect(response.body).toEqual({ message: "Invalid ID format" });
      expect(response.status).toBe(400);
    });

    test("If the token is malformed or expired, return 401 - Could not validate token", async () => {
      const expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjc5YTVkMTg5Mzk3ZDUxNDA3NjE3ZWRmIiwiaWF0IjoxNzU1MjY4NDYyLCJleHAiOjE3NTUyNjkwNjJ9.Oqy48kRFvYEK15dWBb1hpXLpCCC_rDMX0BWqoqxRmFk";
      const badCookie = `token=${expiredToken}; HttpOnly; Path=/; Secure`;
       const response = await request(app)
        .get(`/api/patterns/${pattern._id}`)
         .set("Cookie", badCookie);
      
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Could not verify token" });
    })
  });
});
  

