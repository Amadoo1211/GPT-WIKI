import prisma from "../db/prisma.js";

export const ensureCredits = async (userId, cost) => {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.credits < cost) {
      throw new Error("Insufficient credits");
    }
    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: cost } },
    });
    return updated.credits;
  });
};

export const addCredits = async (userId, amount) => {
  await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: amount } },
  });
};
