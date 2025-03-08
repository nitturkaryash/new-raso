// Database setup script
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log(`Supabase URL: ${supabaseUrl ? 'Available' : 'Missing'}`);
console.log(`Supabase Anon Key: ${supabaseAnonKey ? 'Available' : 'Missing'}`);

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials are missing. Please check your .env.local file.');
  console.log('\nMake sure your .env.local file contains:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupDatabase() {
  try {
    // Check connection to Supabase
    console.log('Testing connection to Supabase...');
    const { data: connectionTest, error: connectionError } = await supabase.from('_test_connection').select('*').limit(1).maybeSingle();
    
    if (connectionError && connectionError.code === '42P01') {
      console.log('Connection successful but test table does not exist (expected).');
    } else if (connectionError) {
      console.error('Error connecting to Supabase:', connectionError);
      throw new Error('Failed to connect to Supabase');
    } else {
      console.log('Connection successful.');
    }
    
    // Read SQL file
    console.log('\nReading database initialization SQL...');
    let sqlScript;
    try {
      sqlScript = fs.readFileSync('./database-init.sql', 'utf8');
      console.log('SQL file read successfully.');
    } catch (fileError) {
      console.error('Error reading SQL file:', fileError);
      console.log('\nPlease make sure the database-init.sql file exists in the project root.');
      process.exit(1);
    }
    
    // Display instructions for setting up the database
    console.log('\n========== DATABASE SETUP INSTRUCTIONS ==========');
    console.log('To set up your database:');
    console.log('1. Login to your Supabase dashboard at https://app.supabase.com/');
    console.log('2. Select your project');
    console.log('3. Navigate to the SQL Editor');
    console.log('4. Create a New Query');
    console.log('5. Paste the following SQL:');
    console.log('\n------- START SQL SCRIPT -------');
    console.log(sqlScript);
    console.log('------- END SQL SCRIPT -------\n');
    console.log('6. Run the SQL script');
    console.log('7. Verify that the tables are created in the Table Editor');
    console.log('=====================================================\n');
    
    // Sign in anonymously to create a test user
    console.log('Creating a test user...');
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
    
    if (authError) {
      console.error('Error creating test user:', authError);
    } else {
      console.log('Test user created with ID:', authData.user.id);
      console.log('\nIMPORTANT: Use this user ID in your SQL script when inserting test data:');
      console.log(`Replace 'auth.uid()' with '${authData.user.id}' in the INSERT statements`);
    }
    
    console.log('\nDatabase setup instructions complete.');
    console.log('After setting up the database, you can run `yarn dev` to start the application.');
    
  } catch (e) {
    console.error('Exception in setupDatabase:', e);
  }
}

setupDatabase(); 