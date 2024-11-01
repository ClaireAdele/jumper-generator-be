const User = require("../../models/users");
require("../../mongodb_helper");

describe("TESTS FOR Users SCHEMA", () => {
     beforeEach(async () => {
       await User.deleteMany({});
     });
    
    test("A User is created in teh database when the relevant fields on the schema are set correctly", async () => {
        const user = new User({
            username: "testUser",
            email: "test@email.com",
            password: "password"
        });

        await user.save();
        
        const [savedUser] = await User.find({ username: "testUser" });
        
        expect(savedUser).toHaveProperty("email", "test@email.com");
        expect(savedUser).toHaveProperty("password", "password");
        expect(savedUser).toHaveProperty("username", "testUser");
        expect(savedUser).toHaveProperty("_id");
    });
});