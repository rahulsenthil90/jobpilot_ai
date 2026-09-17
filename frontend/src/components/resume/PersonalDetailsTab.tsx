import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, MapPin, Phone, UserRound, Briefcase, Globe } from "lucide-react";

function Field({ 
  icon, 
  label, 
  id, 
  value, 
  onChange, 
  placeholder,
  readOnly 
}: { 
  icon: React.ReactNode; 
  label: string; 
  id: string; 
  value: string; 
  onChange: (e: any) => void; 
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-2.5 text-muted-foreground [&_svg]:size-4">{icon}</span>
        <Input 
          id={id} 
          className="pl-9" 
          value={value} 
          onChange={onChange} 
          placeholder={placeholder} 
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

export default function PersonalDetailsTab() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    portfolio: "",
    github: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      setLoading(true);
      try {
        const docRef = doc(db, "profiles", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            name: data.name || user.displayName || "",
            email: data.email || user.email || "",
            phone: data.phone || "",
            location: data.location || (data.city ? `${data.city}, ${data.state}` : ""),
            linkedin: data.linkedin || "",
            portfolio: data.portfolio || "",
            github: data.github || "",
          });
        } else {
          setFormData(prev => ({
            ...prev,
            name: user.displayName || "",
            email: user.email || "",
          }));
        }
      } catch (error) {
        console.error("Error loading profile", error);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage("");
    try {
      await setDoc(doc(db, "profiles", user.uid), formData, { merge: true });
      setMessage("Profile saved successfully!");
    } catch (error) {
      console.error("Error saving profile", error);
      setMessage("Error saving profile. Please try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground py-8 text-center">Loading personal details...</div>;
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field icon={<UserRound/>} label="Full name" id="name" value={formData.name} onChange={handleChange} />
        <Field icon={<Mail/>} label="Email" id="email" value={formData.email} onChange={handleChange} readOnly />
        <Field icon={<Phone/>} label="Phone" id="phone" value={formData.phone} onChange={handleChange} />
        <Field icon={<MapPin/>} label="Location" id="location" value={formData.location} onChange={handleChange} placeholder="e.g. San Francisco, CA" />
        <Field icon={<Briefcase/>} label="LinkedIn URL" id="linkedin" value={formData.linkedin} onChange={handleChange} placeholder="https://linkedin.com/in/..." />
        <Field icon={<Globe/>} label="Portfolio / Website" id="portfolio" value={formData.portfolio} onChange={handleChange} placeholder="https://..." />
        <Field icon={<Globe/>} label="GitHub URL" id="github" value={formData.github} onChange={handleChange} placeholder="https://github.com/..." />
      </div>
      
      <div className="mt-8 flex items-center justify-end gap-4">
        {message && (
          <span className={`text-sm font-medium ${message.includes("Error") ? "text-destructive" : "text-green-600"}`}>
            {message}
          </span>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save details"}
        </Button>
      </div>
    </section>
  );
}
