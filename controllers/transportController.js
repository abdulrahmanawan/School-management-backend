const Vehicle = require('../models/Vehicle');
const StudentTransport = require('../models/StudentTransport');
const Student = require('../models/Student');

// Vehicles CRUD
exports.getVehicles = async (req, res) => {
  const vehicles = await Vehicle.findAll({ order: [['vehicle_number', 'ASC']] });
  res.json(vehicles);
};
exports.createVehicle = async (req, res) => {
  const vehicle = await Vehicle.create(req.body);
  res.status(201).json(vehicle);
};
exports.updateVehicle = async (req, res) => {
  const vehicle = await Vehicle.findByPk(req.params.id);
  if (!vehicle) return res.status(404).json({ message: 'Not found' });
  await vehicle.update(req.body);
  res.json(vehicle);
};
exports.deleteVehicle = async (req, res) => {
  const vehicle = await Vehicle.findByPk(req.params.id);
  if (!vehicle) return res.status(404).json({ message: 'Not found' });
  await vehicle.destroy();
  res.sendStatus(204);
};

// Student assignments
exports.getAssignments = async (req, res) => {
  const assignments = await StudentTransport.findAll({
    include: [
      { model: Vehicle, attributes: ['vehicle_number'] },
      { model: Student, attributes: ['id', 'name', 'class'] },
    ],
    order: [['id', 'DESC']],
  });
  res.json(assignments);
};
exports.assignStudent = async (req, res) => {
  const { student_id, vehicle_id, pickup_point } = req.body;
  const assignment = await StudentTransport.create({ student_id, vehicle_id, pickup_point });
  res.status(201).json(assignment);
};
exports.removeAssignment = async (req, res) => {
  const assignment = await StudentTransport.findByPk(req.params.id);
  if (!assignment) return res.status(404).json({ message: 'Not found' });
  await assignment.destroy();
  res.sendStatus(204);
};