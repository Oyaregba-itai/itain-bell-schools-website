import json
import secrets
import string

staff_list = [
    "Mr Godiya Yakubu",
    "Mr James Hakuri",
    "Mrs Nse Nwajea",
    "Miss Vhrmdah Ayuba",
    "Miss Mary Edet",
    "Miss Mercy Uche",
    "Mrs Evelyn Odogwu",
    "Miss Ogiji Glory",
    "Miss Elizabeth",
    "Miss Elizabeth Adigwe",
    "Mrs Balogun Wuraola",
    "Mrs Blessing Ayodele",
    "Miss Omowunmi Azeez",
    "Mrs Kushoro Adedayo",
    "Mrs Egele  Olubunmi",
    "Miss Kehinde Ademoyegun",
    "Mrs Peace Judy Wenegieme",
    "Mrs Yetunde Bakare",
    "Mrs Oloje Ronke",
    "Mrs Adesola Ojekunle",
    "Mr Segun Adedunye",
    "Mrs Goodness Duru",
    "Mr Oyebode",
    "Mr Nicolas",
]

# Remove duplicates and sort
staff_list = sorted(list(set(staff_list)))

staff_accounts = []

for idx, name in enumerate(staff_list, 1):
    # Create staff ID
    staff_id = f"STF{idx:03d}"
    
    # Create email from name
    name_parts = name.replace("Mr ", "").replace("Mrs ", "").replace("Miss ", "").split()
    first_name = name_parts[0].lower()
    last_name = name_parts[-1].lower() if len(name_parts) > 1 else "staff"
    email = f"{first_name}.{last_name}@itainbell.school"
    
    # Generate strong password
    password = ''.join(secrets.choice(string.ascii_letters + string.digits + string.punctuation) for _ in range(12))
    
    # Determine role
    role = "teacher"  # Default to teacher
    
    staff_accounts.append({
        "staff_id": staff_id,
        "name": name,
        "email": email,
        "password": password,
        "role": role
    })

# Save to JSON
with open("staff_accounts.json", "w") as f:
    json.dump(staff_accounts, f, indent=2)

# Also print as table
print("STAFF ACCOUNT CREDENTIALS")
print("=" * 100)
print(f"{'Staff ID':<8} {'Name':<30} {'Email':<40} {'Password':<15}")
print("=" * 100)
for account in staff_accounts:
    print(f"{account['staff_id']:<8} {account['name']:<30} {account['email']:<40} {account['password']:<15}")

print("\n✅ Staff credentials saved to: staff_accounts.json")
print(f"📊 Total staff: {len(staff_accounts)}")
