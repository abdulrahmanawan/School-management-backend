const Setting = require('../models/Setting');

exports.getAll = async (req, res) => {
  const settings = await Setting.findAll();
  const result = {};
  settings.forEach(s => result[s.setting_key] = s.setting_value);
  res.json(result);
};

exports.update = async (req, res) => {
  const { settings } = req.body; // { school_name: '...', academic_year: '...' }
  for (const [key, value] of Object.entries(settings)) {
    await Setting.upsert({ setting_key: key, setting_value: value });
  }
  res.json({ message: 'Settings updated' });
};