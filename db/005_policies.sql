-- RLS policy ALTER statements generated from provided policy table

-- Achievements
ALTER POLICY "Students can view own achievements." ON "public"."achievements" TO public USING (auth.uid() = student_id);
ALTER POLICY "students can insert own achievements" ON "public"."achievements" TO public WITH CHECK (student_id = auth.uid());
ALTER POLICY "students can read own achievements" ON "public"."achievements" TO public USING (student_id = auth.uid());
ALTER POLICY "students can update own achievements" ON "public"."achievements" TO public USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Classrooms
ALTER POLICY "Students can join classroom" ON "public"."classrooms" TO authenticated WITH CHECK (student_id = auth.uid());
ALTER POLICY "Teachers can read classrooms" ON "public"."classrooms" TO authenticated USING (teacher_id = auth.uid());
ALTER POLICY "Users can view their classroom links." ON "public"."classrooms" TO public USING (teacher_id = auth.uid() OR student_id = auth.uid());

-- Lesson choices
ALTER POLICY "read lesson choices" ON "public"."lesson_choices" TO authenticated USING (true);

-- Lesson history
ALTER POLICY "Students can manage their own history." ON "public"."lesson_history" TO public USING (auth.uid() = student_id);
ALTER POLICY "teachers can read lesson history" ON "public"."lesson_history" TO public USING (EXISTS ( SELECT 1 FROM classrooms c WHERE ((c.teacher_id = auth.uid()) AND (c.student_id = lesson_history.student_id))));
ALTER POLICY "Teachers can view history of their students." ON "public"."lesson_history" TO public USING (EXISTS ( SELECT 1 FROM students WHERE ((students.id = lesson_history.student_id) AND (students.teacher_id = auth.uid()))));

-- Lesson questions
ALTER POLICY "read lesson questions" ON "public"."lesson_questions" TO authenticated USING (true);

-- Lesson tracks
ALTER POLICY "read lesson tracks" ON "public"."lesson_tracks" TO authenticated USING (true);

-- Lessons
ALTER POLICY "read lessons" ON "public"."lessons" TO authenticated USING (true);

-- Notifications
ALTER POLICY "Teachers can send notifications" ON "public"."notifications" TO authenticated WITH CHECK (sender_id = auth.uid());
ALTER POLICY "teachers_can_read_sent_notifications" ON "public"."notifications" TO authenticated USING (sender_id = auth.uid());
ALTER POLICY "teachers_can_send_notifications" ON "public"."notifications" TO authenticated WITH CHECK (sender_id = auth.uid());
ALTER POLICY "users_can_delete_own_notifications" ON "public"."notifications" TO authenticated USING (recipient_id = auth.uid());
ALTER POLICY "users_can_read_own_notifications" ON "public"."notifications" TO authenticated USING (recipient_id = auth.uid());

-- Profiles
ALTER POLICY "Public profiles are viewable by everyone." ON "public"."profiles" TO public USING (true);
ALTER POLICY "Users can insert own profile." ON "public"."profiles" TO authenticated WITH CHECK (auth.uid() = id);
ALTER POLICY "Users can update own profile." ON "public"."profiles" TO public USING (auth.uid() = id);

-- Skills mastery
ALTER POLICY "Users can manage own skills." ON "public"."skills_mastery" TO public USING (auth.uid() = student_id);

-- Students
ALTER POLICY "Students can insert own data" ON "public"."students" TO authenticated WITH CHECK (auth.uid() = id);
ALTER POLICY "Students can update own data" ON "public"."students" TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
ALTER POLICY "Students can view and update own data." ON "public"."students" TO public USING (auth.uid() = id);
ALTER POLICY "Teachers can read students" ON "public"."students" TO authenticated USING (teacher_id = auth.uid());
ALTER POLICY "Teachers can view their assigned students." ON "public"."students" TO public USING (auth.uid() = teacher_id);

-- Teacher invites
ALTER POLICY "Anyone can check an invite token." ON "public"."teacher_invites" TO public USING (true);
ALTER POLICY "Teachers can manage own invites." ON "public"."teacher_invites" TO public USING (auth.uid() = teacher_id);

-- Teachers
ALTER POLICY "teachers_insert_policy" ON "public"."teachers" TO authenticated WITH CHECK (auth.uid() = id);
ALTER POLICY "teachers_select_policy" ON "public"."teachers" TO public USING (true);
ALTER POLICY "teachers_update_policy" ON "public"."teachers" TO authenticated USING (auth.uid() = id);

-- Notes:
-- These ALTER POLICY statements assume the policies already exist and simply replace their USING / WITH CHECK expressions.
-- If a policy does not yet exist, run CREATE POLICY with the same names and expressions instead.
