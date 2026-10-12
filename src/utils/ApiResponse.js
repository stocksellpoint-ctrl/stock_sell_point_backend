export class ApiResponse {
  static ok(res, data, message = 'Success') {
    return res.status(200).json({ success: true, message, data });
  }
  static created(res, data, message = 'Created') {
    return res.status(201).json({ success: true, message, data });
  }
  static noContent(res) {
    return res.status(204).send();
  }
}