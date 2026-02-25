/**
 * UserManagementPage.modals.tsx
 * Modal components: InviteUserModal, BulkImportModal
 */
import React, { useState } from "react";
import { useMutation } from "urql";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const CREATE_USER = `mutation CreateUser($input: CreateUserInput!) { createUser(input: $input) { id email firstName lastName role } }`;

const BULK_IMPORT = `mutation BulkImportUsers($csvData: String!) { bulkImportUsers(csvData: $csvData) { created updated failed errors } }`;

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  onSuccess: () => void;
}

export function InviteUserModal({ open, onClose, tenantId, onSuccess }: InviteUserModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [error, setError] = useState("");
  const [, createUser] = useMutation(CREATE_USER);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = await createUser({ input: { email, firstName, lastName, role, tenantId } });
    if (result.error) { setError(result.error.message); return; }
    setFirstName(""); setLastName(""); setEmail(""); setRole("STUDENT");
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Invite User</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First Name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
            <div><Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
          </div>
          <div><Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="STUDENT">Student</SelectItem>
                <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                <SelectItem value="RESEARCHER">Researcher</SelectItem>
                <SelectItem value="ORG_ADMIN">Org Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Invite</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkImportModal({ open, onClose, onSuccess }: BulkImportModalProps) {
  const [csvData, setCsvData] = useState("");
  const [result, setResult] = useState<{ created: number; updated: number; failed: number; errors: string[] } | null>(null);
  const [, bulkImport] = useMutation(BULK_IMPORT);

  const handleImport = async () => {
    if (!csvData.trim()) return;
    const res = await bulkImport({ csvData });
    if (res.data?.bulkImportUsers) {
      setResult(res.data.bulkImportUsers as { created: number; updated: number; failed: number; errors: string[] });
      if (res.data.bulkImportUsers.failed === 0) { onSuccess(); }
    }
  };

  const handleClose = () => { setCsvData(""); setResult(null); onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Bulk Import Users</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Paste CSV data with columns: <code>email,firstName,lastName,role</code>
          </p>
          <Textarea
            placeholder={`email,firstName,lastName,role\njdoe@example.com,John,Doe,STUDENT`}
            rows={8}
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
          />
          {result && (
            <Alert variant={result.failed > 0 ? "destructive" : "default"}>
              <AlertDescription>
                Created: {result.created} | Updated: {result.updated} | Failed: {result.failed}
                {result.errors.length > 0 && (
                  <ul className="mt-2 text-xs list-disc list-inside">
                    {result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Close</Button>
            <Button onClick={() => { void handleImport(); }} disabled={!csvData.trim()}>Import</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
