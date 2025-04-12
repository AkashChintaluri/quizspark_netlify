const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hntrpejpiboxnlbzrbbc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhudHJwZWpwaWJveG5sYnpyYmJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNDA4NTMsImV4cCI6MjA1ODgxNjg1M30.J4R67CjTWG6WaTtAtuHNTmDFKGaGWvA4R1gWRBBmMDc';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase; 