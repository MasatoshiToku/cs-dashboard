import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/((?!api/revalidate|_next/static|_next/image|favicon.ico).*)'],
};

export function middleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="CS Dashboard"' },
    });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = atob(base64Credentials);
  const [user, password] = credentials.split(':');

  const validUser = process.env.BASIC_AUTH_USER;
  const validPassword = process.env.BASIC_AUTH_PASSWORD;

  if (user !== validUser || password !== validPassword) {
    return new NextResponse('Invalid credentials', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="CS Dashboard"' },
    });
  }

  return NextResponse.next();
}
