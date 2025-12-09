"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "./supabase";

export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  const image = formData.get("image") as string;
  const username = formData.get("username") as string;
  const email = formData.get("email") as string;

  // 1. Generate a random 8-digit password
  const newPassword = Math.random().toString(36).slice(-8);

  // 2. Insert the new user
  const { data, error } = await supabase
    .from("users")
    .insert([{ name, image, username, email, pass: newPassword }])
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: "Failed to create user: " + error.message,
    };
  }

  revalidatePath("/admin/dashboard/users");

  // 3. Return user data with the generated password
  return {
    success: true,
    message: "User created successfully",
    data: { ...data, pass: newPassword },
  };
}

export async function updateUser(formData: FormData) {
  const uid = formData.get("uid") as string;
  const name = formData.get("name") as string;
  const image = formData.get("image") as string;
  const username = formData.get("username") as string;
  const email = formData.get("email") as string;
  const pass = formData.get("pass") as string;

  const { data, error } = await supabase
    .from("users")
    .update({ name, image, username, email, pass })
    .eq("uid", uid)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: "Failed to update user: " + error.message,
    };
  }

  revalidatePath("/admin/dashboard/users");

  return {
    success: true,
    data,
  };
}
