use crate::models::RunningProcess;
use std::collections::HashSet;
use sysinfo::{ProcessesToUpdate, System};

pub struct ProcessMonitor {
    system: System,
}

impl ProcessMonitor {
    pub fn new() -> Self {
        Self {
            system: System::new_all(),
        }
    }

    pub fn refresh(&mut self) -> Vec<RunningProcess> {
        self.system.refresh_processes(ProcessesToUpdate::All, true);
        let mut processes: Vec<RunningProcess> = self
            .system
            .processes()
            .iter()
            .map(|(pid, process)| RunningProcess {
                pid: pid.as_u32(),
                name: process.name().to_string_lossy().into_owned(),
                executable: process
                    .exe()
                    .map(|path| path.to_string_lossy().into_owned())
                    .unwrap_or_default(),
            })
            .collect();
        processes.sort_by(|left, right| {
            left.name
                .to_lowercase()
                .cmp(&right.name.to_lowercase())
                .then(left.pid.cmp(&right.pid))
        });
        processes
    }

    pub fn running_names(&mut self) -> HashSet<String> {
        self.refresh()
            .into_iter()
            .map(|process| process.name)
            .collect()
    }
}

pub fn list_running_processes() -> Vec<RunningProcess> {
    ProcessMonitor::new().refresh()
}
