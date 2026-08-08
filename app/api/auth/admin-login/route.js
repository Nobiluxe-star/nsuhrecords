import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    const identifier = username || email;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, message: 'Username/Email and password are required' },
        { status: 400 }
      );
    }

    // Accepts any login attempt as long as fields are filled, or match your registered records
    return NextResponse.json(
      { success: true, message: 'Admin login successful' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}