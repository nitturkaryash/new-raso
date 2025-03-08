# GST Invoice System Setup Guide

This document provides a comprehensive guide to setting up and running the GST Invoice System application.

## Prerequisites

- Node.js (v18 or higher)
- Yarn package manager
- Supabase account (for database)
- Razorpay account (for payment processing)

## Setup Steps

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/gst-invoice-system.git
cd gst-invoice-system
```

### 2. Install Dependencies

```bash
yarn install
```

### 3. Set Up Supabase

1. Create a new Supabase project at https://supabase.io
2. Get your Supabase URL and anon key from the project settings
3. Set up the database schema using the SQL editor in the Supabase dashboard:
   - Navigate to the SQL Editor in your Supabase dashboard
   - Copy the contents of `database-init.sql` from this repository
   - Run the SQL query to create all necessary tables and indexes

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory with the following:

```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Razorpay Configuration (only if using payment functionality)
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# App URL (important for callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Create Test Data

After setting up your database schema, you can create test data using our helper script:

```bash
node test-create-transaction.js
```

This will create a sample transaction in your database with a valid user_id.

### 6. Run the Development Server

```bash
yarn dev
```

The application should now be running at http://localhost:3000.

## Common Issues and Solutions

### Database Connection Issues

If you see errors related to database connection:

1. Verify your Supabase URL and anon key in the `.env.local` file
2. Check if your IP is allowed in Supabase project settings
3. Test your database connection with the test script: `node test-transaction.js`

### Missing user_id Error

If you see an error about "null value in column 'user_id'":

1. Make sure you're signed in (the app uses Supabase authentication)
2. Use the `test-create-transaction.js` script that handles user authentication properly

### Razorpay Integration Issues

If you're having problems with payment processing:

1. Make sure both `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are correctly set
2. Refer to the `RAZORPAY_API_INSTRUCTIONS.md` file for detailed Razorpay setup

## Database Schema

The application uses three main tables:

1. **services** - Stores information about services you offer
2. **transactions** - Stores invoice/transaction data
3. **transaction_items** - Stores line items for each transaction

Each table includes a `user_id` field that links records to specific users, enabling multi-user support.

## Making the Application Dynamic

To make the application more dynamic:

1. **Custom User Roles**: Modify RLS policies in Supabase to create different access levels
2. **Multiple Business Profiles**: Create a new table for storing business profiles
3. **Custom Templates**: Add a templates table to allow for different invoice layouts
4. **Custom Tax Rates**: Allow configurable tax rates in the services table

## Direct Payments

The application supports payments directly from the invoice. When you click "Pay Now" on an invoice page, the system will:

1. Use the exact amount from the invoice to create a Razorpay order
2. Show the Razorpay payment modal with the invoice amount
3. Process the payment and redirect to a success page

If a transaction doesn't exist in the database, the system will allow you to enter a custom amount for the payment.

## Payment Testing

For testing Razorpay payments, use the following test credentials:
- Card Number: 4111 1111 1111 1111
- Expiry Date: Any future date
- CVV: Any 3-digit number
- Name: Any name
- OTP: 1234

## Command-Line Testing Tools

The following command-line tool is available to help test the application:

1. `node test-create-transaction.js [id] [amount]` - Creates a test transaction with a specific ID and amount

This tool helps verify that the payment flow works properly with various transaction amounts.

## Troubleshooting

If you encounter issues with the application:

1. Check the browser console for client-side errors
2. Check the terminal running the Next.js server for server-side errors
3. Use the provided test scripts to verify database connectivity
4. Make sure all required environment variables are set correctly
5. If needed, use the `restart-app.bat` script (on Windows) to restart the application

For any other issues, please open a GitHub issue or contact support. 