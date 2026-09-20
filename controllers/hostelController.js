const HostelRoom = require('../models/HostelRoom');
const HostelAssignment = require('../models/HostelAssignment');
const Student = require('../models/Student');

exports.getRooms = async (req, res) => {
  const rooms = await HostelRoom.findAll({ order: [['room_number', 'ASC']] });
  res.json(rooms);
};
exports.createRoom = async (req, res) => {
  const room = await HostelRoom.create(req.body);
  res.status(201).json(room);
};
exports.updateRoom = async (req, res) => {
  const room = await HostelRoom.findByPk(req.params.id);
  if (!room) return res.status(404).json({ message: 'Not found' });
  await room.update(req.body);
  res.json(room);
};
exports.deleteRoom = async (req, res) => {
  const room = await HostelRoom.findByPk(req.params.id);
  if (!room) return res.status(404).json({ message: 'Not found' });
  await room.destroy();
  res.sendStatus(204);
};

exports.getAssignments = async (req, res) => {
  const assignments = await HostelAssignment.findAll({
    include: [
      { model: HostelRoom, attributes: ['room_number'] },
      { model: Student, attributes: ['id', 'name', 'class'] },
    ],
    order: [['id', 'DESC']],
  });
  res.json(assignments);
};
exports.assignStudent = async (req, res) => {
  const { student_id, room_id, check_in_date } = req.body;
  const room = await HostelRoom.findByPk(room_id);
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (room.current_occupancy >= room.capacity) return res.status(400).json({ message: 'Room full' });

  const assignment = await HostelAssignment.create({ student_id, room_id, check_in_date });
  await room.update({ current_occupancy: room.current_occupancy + 1 });
  res.status(201).json(assignment);
};
exports.removeAssignment = async (req, res) => {
  const assignment = await HostelAssignment.findByPk(req.params.id);
  if (!assignment) return res.status(404).json({ message: 'Not found' });
  const room = await HostelRoom.findByPk(assignment.room_id);
  if (room) await room.update({ current_occupancy: room.current_occupancy - 1 });
  await assignment.destroy();
  res.sendStatus(204);
};