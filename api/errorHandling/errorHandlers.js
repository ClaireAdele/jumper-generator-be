exports.handleInvalidInput = (err, req, res, next) => {
  if (err._msg) {
    res.status(400).send({ message: `Mongoose error : ${err_message}` });
  } else {
    next(err);
  }
};

//Middleware error-handler handles any errors I might have missed in my custom error-handling & testing.
exports.handleUnknownError = (err, req, res, next) => {
  res.status(500).send({ message: "Unknown error - try again later" });
};

//Controller function that handles non-existant urls.
exports.handleInvalidPath = (req, res, next) => {
  res
    .status(404)
    .send({
      message: "Not Found - the url entered does not match any content",
    });
};

//Controller function that handles all the invalid method errors.
exports.handleInvalidMethod = (req, res, next) => {
  res.status(405).send({ message: "Method not supported" });
};
