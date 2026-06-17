"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import type { CustomizationGroup } from "@/lib/types";

interface CustomizationEditorProps {
  value: CustomizationGroup[];
  onChange: (next: CustomizationGroup[]) => void;
}

export default function CustomizationEditor({
  value,
  onChange,
}: CustomizationEditorProps) {
  const update = (next: CustomizationGroup[]) => onChange(next);

  const addGroup = () => {
    update([
      ...value,
      {
        name: "",
        type: "single",
        required: false,
        order: value.length,
        options: [],
      },
    ]);
  };

  const updateGroup = (gi: number, patch: Partial<CustomizationGroup>) => {
    update(value.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  };

  const removeGroup = (gi: number) => {
    update(value.filter((_, i) => i !== gi));
  };

  const addOption = (gi: number) => {
    const g = value[gi];
    updateGroup(gi, {
      options: [
        ...g.options,
        { name: "", price_delta: 0, order: g.options.length },
      ],
    });
  };

  const updateOption = (
    gi: number,
    oi: number,
    patch: Partial<{ name: string; price_delta: number }>,
  ) => {
    const g = value[gi];
    updateGroup(gi, {
      options: g.options.map((o, i) => (i === oi ? { ...o, ...patch } : o)),
    });
  };

  const removeOption = (gi: number, oi: number) => {
    const g = value[gi];
    updateGroup(gi, { options: g.options.filter((_, i) => i !== oi) });
  };

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1 }}
      >
        <Typography variant="subtitle2">Customization groups</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={addGroup}>
          Add group
        </Button>
      </Stack>

      {value.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          No customization groups.
        </Typography>
      )}

      <Stack spacing={2}>
        {value.map((group, gi) => (
          <Paper key={gi} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <TextField
                label="Group name"
                size="small"
                value={group.name}
                onChange={(e) => updateGroup(gi, { name: e.target.value })}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Type"
                size="small"
                select
                value={group.type}
                onChange={(e) =>
                  updateGroup(gi, {
                    type: e.target.value as "single" | "multi",
                  })
                }
                sx={{ width: 120 }}
              >
                <MenuItem value="single">Single</MenuItem>
                <MenuItem value="multi">Multi</MenuItem>
              </TextField>
              <FormControlLabel
                control={
                  <Switch
                    checked={group.required}
                    onChange={(e) =>
                      updateGroup(gi, { required: e.target.checked })
                    }
                  />
                }
                label="Required"
              />
              <IconButton color="error" onClick={() => removeGroup(gi)}>
                <DeleteOutlineIcon />
              </IconButton>
            </Stack>

            <Box sx={{ pl: 1, mt: 1.5 }}>
              <Stack spacing={1}>
                {group.options.map((opt, oi) => (
                  <Stack key={oi} direction="row" spacing={1.5} alignItems="center">
                    <TextField
                      label="Option"
                      size="small"
                      value={opt.name}
                      onChange={(e) =>
                        updateOption(gi, oi, { name: e.target.value })
                      }
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Price delta"
                      size="small"
                      type="number"
                      value={opt.price_delta}
                      onChange={(e) =>
                        updateOption(gi, oi, {
                          price_delta: Number(e.target.value),
                        })
                      }
                      sx={{ width: 130 }}
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeOption(gi, oi)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => addOption(gi)}
                sx={{ mt: 1 }}
              >
                Add option
              </Button>
            </Box>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
