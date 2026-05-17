import openpyxl

# Load the Excel file
wb = openpyxl.load_workbook('list of pupils for 25,26 session.xlsx')
ws = wb.active

# Extract data and create SQL INSERT statement
sql_values = []
for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i > 0:  # Skip header
        if row[1] and row[2]:  # Name and class must exist
            name = str(row[1]).strip().replace("'", "''")  # Escape single quotes
            class_name = str(row[2]).strip().replace("'", "''")
            sql_values.append(f"('{name}', '{class_name}')")

# Create SQL for student insertion
student_sql = "INSERT INTO students (full_name, class_name) VALUES\n" + ",\n".join(sql_values) + ";"

# Create combined SQL with delete and delete duplicate class
full_sql = """-- Delete existing students and duplicate class, insert real students
DELETE FROM students;

DELETE FROM classes WHERE name = 'Year 1' AND description IS NULL;

""" + student_sql

with open('insert_students.sql', 'w') as f:
    f.write(full_sql)

print(f"Generated SQL with {len(sql_values)} students")
