# Messaging System Setup Guide

## ✅ What's Been Implemented

### 1. **Direct Messaging** 💬
- Users can send direct messages to any other user (teachers, parents, staff)
- Real-time message display with timestamps
- Read receipts (checkmark shows when message is read)
- Automatic message retrieval and caching
- Conversation history

### 2. **Group Messaging** 👥 (Admin-Only)
- Admins can create groups for specific users
- Add/remove members from groups
- Group-based messaging
- All group members can see the full conversation
- Groups are organized by name and description

### 3. **Dashboard Integration**
- **All Users**: "Messages" tab for direct messaging
- **Admins Only**: 
  - "Messages" tab for direct messaging
  - "Group Messaging" tab to manage groups and group conversations

---

## 🚀 How to Activate the Messaging System

### Step 1: Apply Database Migration
The messaging system requires new database tables. Apply this migration:

**Option A: Via Supabase Dashboard (Recommended)**

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/mcpajyzmdyvolpkwfmpq/sql/new)
2. Copy the entire content of `supabase/migrations/20260515_add_messaging_system.sql`
3. Paste it into the SQL editor
4. Click "Run"
5. You should see "✅ Success" at the bottom

**Option B: Via Python Script**
```powershell
cd c:\Users\USER\Documents\itain-bell-schools-website
python apply_migration.py
```

### Step 2: Reload Development Server
```powershell
# If dev server is running, press Ctrl+C to stop it
npm run dev
```

The dev server will restart on port 8083 (or next available port).

### Step 3: Test Messaging

1. **Direct Messaging Test:**
   - Log in as admin or any user
   - Click "Messages" tab in dashboard
   - Click "New Message" button
   - Select another user
   - Send a test message
   - Switch to that user (logout/login or open incognito window)
   - Verify message appears and can reply

2. **Group Messaging Test (Admin Only):**
   - Log in as admin
   - Click "Group Messaging" tab
   - Click "New Group" button
   - Enter group name and description
   - Select members to add
   - Click "Create Group"
   - Send test messages in the group
   - Verify all members can see messages

---

## 📱 Feature Details

### Direct Messaging Features
- **Message List**: View all conversations (users you've messaged or who've messaged you)
- **New Message**: Start conversation with any user
- **Message History**: Automatically loads all previous messages in conversation
- **Read Receipts**: Check mark (✓) appears on your sent messages when recipient reads them
- **Auto-Refresh**: Messages update automatically
- **Timestamps**: Every message shows when it was sent

### Group Messaging Features (Admin)
- **Create Group**: Name, description, and select specific members
- **Manage Members**: Add or remove members from groups at any time
- **Group Chat**: All members see full conversation history
- **Member Info**: See when members joined the group
- **Admin Controls**: Only admins can create/manage groups

---

## 🗂️ Files Created

### Components
- `src/components/MessagingView.tsx` - Direct messaging UI for all users
- `src/components/GroupMessagingView.tsx` - Group management and messaging (admin)

### Database Migration
- `supabase/migrations/20260515_add_messaging_system.sql` - Creates 4 new tables:
  - `messages` - Direct messages between users
  - `message_groups` - Group definitions
  - `group_members` - Group membership tracking
  - `group_messages` - Group conversation messages

### Configuration
- `supabase/migrations/20260515_add_messaging_system.sql` includes:
  - Row-Level Security (RLS) policies for all tables
  - Performance indexes on created_at and foreign keys
  - Proper constraints and relationships

---

## 🔐 Security & Permissions

### Messages Table
- ✅ Users can only view their own messages (sent or received)
- ✅ Users can only send messages as themselves
- ✅ Users can mark their received messages as read

### Message Groups Table
- ✅ Users can only view groups they're members of
- ✅ Only admins can create groups
- ✅ Only admins can update group details

### Group Members Table
- ✅ Users can only view members of groups they belong to
- ✅ Only admins can add/remove members

### Group Messages Table
- ✅ Group members can view messages in their groups
- ✅ Only group members can send messages in their groups

---

## 📊 Database Schema

### messages
```
id: UUID (primary key)
sender_id: UUID (references auth.users)
recipient_id: UUID (references auth.users)
content: text
read_at: timestamp (null until read)
created_at: timestamp
```

### message_groups
```
id: UUID (primary key)
name: text
description: text (optional)
created_by: UUID (references auth.users)
created_at: timestamp
```

### group_members
```
id: UUID (primary key)
group_id: UUID (references message_groups)
user_id: UUID (references auth.users)
joined_at: timestamp
UNIQUE(group_id, user_id)
```

### group_messages
```
id: UUID (primary key)
group_id: UUID (references message_groups)
sender_id: UUID (references auth.users)
content: text
created_at: timestamp
```

---

## 🧪 Testing Checklist

- [ ] Database migration applied successfully
- [ ] Admin can send direct message to teacher
- [ ] Teacher receives and can reply to message
- [ ] Admin can create a new group
- [ ] Admin can add members to group
- [ ] All group members can see messages
- [ ] Admin can remove member from group
- [ ] Messages persist after page reload
- [ ] Read receipts show correctly
- [ ] Timestamps display in correct format

---

## 🐛 Troubleshooting

### "No messages tab appears"
- Ensure dev server restarted after code changes
- Clear browser cache (Ctrl+Shift+Delete)
- Check browser console for errors (F12)

### "Can't send messages"
- Verify database migration was applied (check Supabase dashboard > SQL Editor > Migrations)
- Check browser console for error messages
- Ensure user is logged in and has valid session

### "Can't see other users"
- Database migration must be applied first
- Try logging out and back in
- Verify other users exist in `profiles` table

### "Group creation fails"
- Only admins can create groups (verify `user_roles` table shows 'admin' role)
- Must select at least one member
- Group name is required

---

## 🚀 Next Steps (Optional Enhancements)

1. **Notifications**: Add real-time push notifications for new messages
2. **Search**: Add message search functionality
3. **Attachments**: Allow file/image attachments in messages
4. **Message Reactions**: Add emoji reactions to messages
5. **Message Editing**: Allow users to edit sent messages
6. **Group Avatars**: Let groups have custom avatars
7. **Typing Indicators**: Show "User is typing..." status
8. **Archive**: Archive old conversations

---

## 📞 Support

If you encounter issues:
1. Check browser console (F12) for errors
2. Verify Supabase connection in `.env.local`
3. Confirm database migration was applied
4. Check user roles in Supabase dashboard

