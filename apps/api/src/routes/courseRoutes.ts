// @ts-nocheck
import type { Request, Response, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authRequired, requireRole, type AuthedRequest } from '../middleware.js';

export function registerCourseRoutes(router: Router) {
  // Create course (Admin only)
  router.post('/courses', authRequired, requireRole(['ADMIN']), async (req: AuthedRequest, res: Response) => {
    const body = z
      .object({
        title: z.string().min(2),
        code: z.string().min(2),
        description: z.string().optional(),
      })
      .parse(req.body);

    const course = await prisma.course.create({
      data: {
        title: body.title,
        code: body.code,
        description: body.description,
      },
    });

    res.json(course);
  });

  // Get courses based on role
  router.get('/courses', authRequired, async (req: AuthedRequest, res: Response) => {
    const user = req.user!;

    if (user.role === 'ADMIN') {
      const courses = await prisma.course.findMany({
        include: {
          courseClasses: {
            include: {
              class: true,
              teacher: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json(courses);
      return;
    }

    if (user.role === 'TEACHER') {
      // Get courses where teacher is assigned through CourseClass
      const courses = await prisma.course.findMany({
        where: {
          courseClasses: {
            some: { teacherId: user.id },
          },
        },
        include: {
          courseClasses: {
            where: { teacherId: user.id },
            include: {
              class: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json(courses);
      return;
    }

    // Student - get courses through their classes
    const courses = await prisma.course.findMany({
      where: {
        courseClasses: {
          some: {
            class: {
              students: { some: { studentId: user.id } },
            },
          },
        },
      },
      include: {
        courseClasses: {
          include: {
            class: true,
            teacher: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(courses);
  });

  // Get all users (for admin to assign teachers/students)
  router.get('/users', authRequired, requireRole(['ADMIN']), async (_req: Request, res: Response) => {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, fullName: true, role: true, profileImage: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  });

  // Get students enrolled in a course (Teacher only - for courses they teach)
  router.get('/courses/:courseId/students', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ courseId: z.string() }).parse(req.params);
    const user = req.user!;

    // Verify teacher teaches this course
    const courseClass = await prisma.courseClass.findFirst({
      where: { courseId: params.courseId, teacherId: user.id },
    });

    if (!courseClass) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    // Get all students in the class(es) where this course is taught by this teacher
    const courseClasses = await prisma.courseClass.findMany({
      where: { courseId: params.courseId, teacherId: user.id },
      include: {
        class: {
          include: {
            students: {
              include: { student: { select: { id: true, fullName: true, email: true } } },
            },
          },
        },
      },
    });

    // Flatten students from all classes
    type CourseClassWithStudents = {
      classId: string;
      class: {
        id: string;
        name: string;
        students: { student: { id: string; fullName: string; email: string } }[];
      };
    };
    
    const typedCourseClasses = courseClasses as CourseClassWithStudents[];
    
    const students = typedCourseClasses.flatMap(cc =>
      cc.class.students.map(s => ({
        ...s.student,
        classId: cc.classId,
        className: cc.class.name,
      }))
    );

    // Remove duplicates (student might be in multiple classes)
    type StudentWithClass = { id: string; fullName: string; email: string; classId: string; className: string };
    const uniqueStudents = students.reduce<StudentWithClass[]>((acc, student) => {
      if (!acc.find(s => s.id === student.id)) {
        acc.push(student);
      }
      return acc;
    }, []);

    res.json(uniqueStudents);
  });

  // Get students enrolled in a specific course-class (Teacher only)
  router.get('/course-classes/:courseClassId/students', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ courseClassId: z.string() }).parse(req.params);
    const user = req.user!;

    // Verify teacher teaches this course-class
    const courseClass = await prisma.courseClass.findFirst({
      where: { id: params.courseClassId, teacherId: user.id },
      include: {
        class: {
          include: {
            students: {
              include: { student: { select: { id: true, fullName: true, email: true } } },
            },
          },
        },
      },
    });

    if (!courseClass) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    type StudentEnrollment = { student: { id: string; fullName: string; email: string } };
    const students = (courseClass.class.students as StudentEnrollment[]).map(s => ({
      ...s.student,
      classId: courseClass.classId,
      className: courseClass.class.name,
    }));

    res.json(students);
  });

  // Student: Get own attempts for a course
  router.get('/courses/:courseId/my-attempts', authRequired, requireRole(['STUDENT']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ courseId: z.string() }).parse(req.params);
    const user = req.user!;

    // Get all assessments for this course
    const assessments = await prisma.assessment.findMany({
      where: { courseId: params.courseId },
      select: { id: true },
    });

    const assessmentIds = assessments.map((a: { id: string }) => a.id);

    // Get student's attempts for these assessments
    const attempts = await prisma.attempt.findMany({
      where: {
        studentId: user.id,
        assessmentId: { in: assessmentIds },
      },
      select: {
        id: true,
        assessmentId: true,
        status: true,
        score: true,
        submittedAt: true,
      },
    });

    res.json(attempts);
  });
}
