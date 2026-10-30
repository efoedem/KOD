# Welcome to your Lovable project

## Admin access

The existing owner account has super-admin access. Other admins can be granted access in **Admin → Admins** by email. Existing confirmed accounts are promoted immediately; a new email is reserved and becomes an admin when its account is created and confirmed. No invitation email is sent automatically.

Regular admins only manage their uploaded books and receive their own portion of mixed-book orders. The dashboard includes total orders, paid orders and the paid amount. Select paid orders to download CSV or genuine XLSX files. Payments remain simulated, as in the original app.

This source uses Lovable Cloud for hosted authentication and server operations. The ZIP excludes private credentials. `.env.example` contains only public browser configuration. Hosted sign-up and sign-in work in Lovable; running the server locally requires a compatible backend with its own private server configuration, which Lovable Cloud does not export.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
