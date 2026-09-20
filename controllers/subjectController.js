const Subject = require('../models/Subject');

exports.getAll = async (req, res) => {
  try {
    const subjects = await Subject.findAll({ order: [['name', 'ASC']] });
    res.json({ subjects });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const subject = await Subject.create(req.body);
    res.status(201).json(subject);
  } catch (error) {
    res.status(400).json({ message: 'Invalid data', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const subject = await Subject.findByPk(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Not found' });
    await subject.update(req.body);
    res.json(subject);
  } catch (error) {
    res.status(400).json({ message: 'Update failed', error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const subject = await Subject.findByPk(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Not found' });
    await subject.destroy();
    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ message: 'Delete failed', error: error.message });
  }
};