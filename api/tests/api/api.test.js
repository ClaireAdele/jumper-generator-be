const app = require("../../app");
const request = require("supertest");


describe("TESTS FOR API ERROR HANLDING", () => { 
    test("Inexistent routes lead to 404", async () => {
        const response = await request(app).get("/non-existent-route");

        expect(response.statusCode).toBe(404);
        expect(response.body.message).toBe("Not Found - the url entered does not match any content");
    });

    test("Request to existing endpoints with method that aren't supported return lead to 405", async () => {
      const response = await request(app).delete("/api/users");

      expect(response.statusCode).toBe(405);
      expect(response.body.message).toBe("Method not supported");
    });

})
