export const getCurrentUser = async (req, res) => {
  const { user } = req;
  res.json({ user });
};
