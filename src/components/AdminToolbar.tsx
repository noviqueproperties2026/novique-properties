import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Upload as UploadIcon, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export const AdminToolbar = ({ active }: { active: "upload" | "delete" | "find" }) => {
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate("/login", { replace: true });
  };

  const linkClass = (k: string) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-smooth ${
      active === k
        ? "bg-primary text-primary-foreground"
        : "text-secondary hover:bg-muted"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <Link to="/upload" className={linkClass("upload")}>
        <UploadIcon size={14} /> Upload
      </Link>
      <Link to="/delete-listings" className={linkClass("delete")}>
        <Trash2 size={14} /> Manage
      </Link>
      <Link to="/find-listing" className={linkClass("find")}>
        <Search size={14} /> Find a Listing
      </Link>
      <div className="ml-auto">
        <Button size="sm" variant="outline" onClick={logout}>
          <LogOut size={14} className="mr-1.5" /> Logout
        </Button>
      </div>
    </div>
  );
};
