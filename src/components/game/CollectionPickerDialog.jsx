import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";

export default function CollectionPickerDialog({ open, onClose, collections, onPick, gameName }) {
  const manual = (collections || []).filter((c) => !c.is_smart);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add to collection</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose a collection for <strong>{gameName}</strong>. Smart collections are managed automatically.
        </Typography>
        {manual.length === 0 ? (
          <Typography color="text.secondary">Create a manual collection in the library first.</Typography>
        ) : (
          <List dense>
            {manual.map((c) => (
              <ListItemButton
                key={c.id}
                onClick={() => {
                  onPick(c.id);
                  onClose();
                }}
              >
                <ListItemText primary={c.name} />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
