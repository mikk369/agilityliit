import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dogSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Autentimata" }, { status: 401 });
    }

    const handler = await prisma.handler.findUnique({
      where: { userId: parseInt(session.user.id) },
    });
    if (!handler) {
      return NextResponse.json(
        { error: "Koeraspetsialist puudub. Palun loo esmalt profiil." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = dogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const dog = await prisma.dog.create({
      data: {
        handlerId: handler.id,
        nickName: data.nickName,
        officialName: data.officialName || null,
        breed: data.breed || null,
        gender: data.gender || null,
        birthday: data.birthday ? new Date(data.birthday) : null,
        sizeEst: data.sizeEst || null,
        sizeFci: data.sizeFci || null,
        agilityClass: data.agilityClass || null,
        jumpClass: data.jumpClass || null,
        registerCode: data.registerCode || null,
        idCode: data.idCode || null,
        generalVaccinationEnd: data.generalVaccinationEnd
          ? new Date(data.generalVaccinationEnd)
          : null,
        rabiesVaccinationEnd: data.rabiesVaccinationEnd
          ? new Date(data.rabiesVaccinationEnd)
          : null,
        ownersName: data.ownersName || null,
        info: data.info || null,
      },
    });

    return NextResponse.json(dog, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
