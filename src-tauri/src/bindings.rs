use tauri_specta::{collect_commands, Builder};

pub fn generate_bindings() -> Builder<tauri::Wry> {
    use crate::api::{
        calendar, calendars, conferences, export, ideas, monitor, papers, plans, projects,
        research, stats, tasks, timer, windows,
    };
    use crate::commands::{notifications, preferences, quick_pane, recovery};

    Builder::<tauri::Wry>::new().commands(collect_commands![
        preferences::greet,
        preferences::load_preferences,
        preferences::save_preferences,
        notifications::send_native_notification,
        recovery::save_emergency_data,
        recovery::load_emergency_data,
        recovery::cleanup_old_recovery_files,
        quick_pane::show_quick_pane,
        quick_pane::dismiss_quick_pane,
        quick_pane::toggle_quick_pane,
        quick_pane::get_default_quick_pane_shortcut,
        quick_pane::update_quick_pane_shortcut,
        tasks::get_today,
        tasks::list_tasks,
        tasks::get_task,
        tasks::list_items,
        tasks::undo,
        tasks::peek_undo,
        tasks::create_task,
        tasks::update_task,
        tasks::set_task_done,
        tasks::set_task_stage,
        tasks::delete_task,
        tasks::list_task_steps,
        tasks::add_task_step,
        tasks::set_task_step_done,
        tasks::delete_task_step,
        tasks::list_day_tasks,
        tasks::create_day_task,
        tasks::get_day_completion,
        projects::list_project_templates,
        projects::list_projects,
        projects::create_project,
        projects::update_project,
        projects::delete_project,
        projects::list_modules,
        projects::add_module,
        projects::rename_module,
        projects::delete_module,
        projects::list_project_tasks,
        projects::add_project_task,
        plans::get_today_line,
        plans::get_week_capacity,
        plans::set_weekday_capacity,
        plans::list_day_overrides,
        plans::set_day_override,
        plans::get_check_ins,
        plans::get_load_forecast,
        plans::get_project_health,
        plans::get_planning_settings,
        plans::save_planning_settings,
        calendar::list_calendar_tasks,
        calendar::list_unscheduled_tasks,
        calendar::schedule_task,
        calendar::create_scheduled_task,
        calendar::list_day_notes,
        calendar::set_day_note,
        stats::get_stats,
        export::get_export,
        export::export_csv,
        export::export_ics,
        export::save_image,
        export::export_research_json,
        research::get_research_overview,
        monitor::monitor_watch,
        monitor::monitor_latest,
        monitor::monitor_info,
        monitor::monitor_targets,
        monitor::list_machines,
        monitor::add_machine,
        monitor::remove_machine,
        calendars::list_calendars,
        calendars::add_calendar,
        calendars::update_calendar,
        calendars::remove_calendar,
        calendars::refresh_calendars,
        calendars::list_calendar_events,
        conferences::list_conferences,
        conferences::refresh_conferences,
        conferences::follow_conference,
        conferences::plan_conference,
        ideas::list_ideas,
        ideas::get_idea,
        ideas::get_idea_counts,
        ideas::create_idea,
        ideas::update_idea,
        ideas::delete_idea,
        ideas::list_tags,
        ideas::create_tag,
        ideas::delete_tag,
        ideas::list_idea_steps,
        ideas::add_idea_step,
        ideas::set_idea_step_done,
        ideas::delete_idea_step,
        ideas::list_idea_links,
        ideas::add_idea_link,
        ideas::delete_idea_link,
        ideas::get_idea_notes,
        ideas::set_idea_notes,
        ideas::set_idea_project,
        ideas::list_idea_todos,
        ideas::add_idea_todo,
        ideas::set_idea_todo_done,
        ideas::delete_idea_todo,
        ideas::list_idea_problems,
        ideas::add_idea_problem,
        ideas::update_idea_problem,
        ideas::delete_idea_problem,
        ideas::list_idea_logs,
        ideas::add_idea_log,
        ideas::delete_idea_log,
        papers::list_papers,
        papers::get_paper,
        papers::get_paper_counts,
        papers::add_paper,
        papers::update_paper,
        papers::delete_paper,
        papers::paper_bibtex,
        papers::list_idea_papers,
        papers::list_paper_ideas,
        papers::link_paper,
        papers::unlink_paper,
        timer::get_running_timer,
        timer::start_timer,
        timer::stop_timer,
        timer::complete_task_partially,
        windows::set_mini_pinned,
        windows::enter_mini_mode,
        windows::leave_mini_mode,
        windows::hide_month_widget,
        windows::open_calendar_day,
        calendar::month_marks,
    ])
}

/// Export TypeScript bindings to the frontend.
/// Run with: cargo test export_bindings -- --ignored
pub fn export_ts_bindings() {
    generate_bindings()
        .export(
            specta_typescript::Typescript::default()
                // Row ids and counts are i64 in Rust; they never get near 2^53, so plain numbers are fine.
                .bigint(specta_typescript::BigIntExportBehavior::Number)
                .header("// @ts-nocheck\n// Auto-generated by tauri-specta. DO NOT EDIT.\n\n"),
            "../src/lib/bindings.ts",
        )
        .expect("Failed to export TypeScript bindings");
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Generate TypeScript bindings file.
    /// This test is ignored by default so it doesn't run in CI.
    /// Run manually with: cargo test export_bindings -- --ignored
    #[test]
    #[ignore]
    fn export_bindings() {
        export_ts_bindings();
        println!("✓ TypeScript bindings exported to ../src/lib/bindings.ts");
    }
}
