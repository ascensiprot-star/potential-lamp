export default function StatCard({ label, value, subtitle, icon: Icon }) {
    return (
        <div className="bg-card border border-border rounded-lg p-5 flex items-start gap-4">
            {Icon && (
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-foreground" />
                </div>
            )}
            <div>
                <p className="text-2xl font-bold font-inter tracking-tight">{value}</p>
                <p className="text-sm text-muted-foreground font-inter">{label}</p>
                {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            </div>
        </div>
    );
}