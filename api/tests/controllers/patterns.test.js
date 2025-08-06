const app = require("../../app");
const request = require("supertest");
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

});
  

