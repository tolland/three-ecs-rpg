#!/bin/bash

# Generate a branch name with date and time
NEW_BRANCH_NAME="copilot-changes-$(date +%Y%m%d-%H%M%S)"
MAIN_BRANCH_NAME="copilot-changes"

# Get the current script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Get the parent directory of the script
PARENT_DIR="$(dirname "$SCRIPT_DIR")"

# Determine the parent directory name (current repo)
CURRENT_REPO=$(basename "$PARENT_DIR")

# Function to manage branches in a repo
manage_branch() {
    local repo_path=$1
    local repo_name=$(basename "$repo_path")

    echo "Managing branches in $repo_name repository..."

    # Check if the directory exists and is a git repository
    if [ ! -d "$repo_path/.git" ]; then
        echo "❌ $repo_path is not a git repository"
        return
    fi

    cd "$repo_path"

    # Check if there are any changes that need to be stashed
    if [ -n "$(git status --porcelain)" ]; then
        echo "Stashing changes in $repo_name..."
        git stash save "Auto-stashed before creating Copilot branch"
        local stashed=true
    else
        local stashed=false
    fi

    # Get current branch name
    CURRENT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null)
    echo "Current branch: $CURRENT_BRANCH"

    # Check if we're on a copilot-changes-* branch
    if [[ "$CURRENT_BRANCH" =~ ^copilot-changes-[0-9]{8}-[0-9]{6}$ ]]; then
        echo "Currently on a timestamped copilot branch. Checking if main copilot branch exists..."
        local OLD_BRANCH=$CURRENT_BRANCH

        # Check if main copilot-changes branch exists
        if git show-ref --verify --quiet refs/heads/$MAIN_BRANCH_NAME; then
            echo "Main $MAIN_BRANCH_NAME branch exists. Merging current changes into it..."

            # Make sure we have a clean working directory before merge
            if git diff --quiet && git diff --staged --quiet; then
                # Try to merge into main copilot-changes branch
                git checkout $MAIN_BRANCH_NAME
                if git merge --no-ff $OLD_BRANCH -m "Merge $OLD_BRANCH into $MAIN_BRANCH_NAME"; then
                    echo "✅ Successfully merged $OLD_BRANCH into $MAIN_BRANCH_NAME"

                    # Delete the old branch after successful merge
                    echo "Deleting old branch $OLD_BRANCH..."
                    git branch -D $OLD_BRANCH
                    echo "✅ Deleted old branch $OLD_BRANCH"
                else
                    echo "❌ Failed to merge. Please resolve conflicts manually."

                    # Restore stashed changes if needed
                    if [ "$stashed" = true ]; then
                        echo "Applying stashed changes..."
                        git stash pop
                    fi

                    return 1
                fi
            else
                echo "Uncommitted changes detected. Please commit or stash your changes manually."

                # Restore stashed changes if needed
                if [ "$stashed" = true ]; then
                    echo "Applying stashed changes..."
                    git stash pop
                fi

                return 1
            fi
        else
            echo "Main $MAIN_BRANCH_NAME branch doesn't exist. Creating it..."
            git branch $MAIN_BRANCH_NAME
            git checkout $MAIN_BRANCH_NAME
            echo "✅ Created and switched to $MAIN_BRANCH_NAME branch"

            # Merge the contents of the old branch
            if git merge --no-ff $OLD_BRANCH -m "Merge $OLD_BRANCH into $MAIN_BRANCH_NAME"; then
                echo "✅ Successfully merged $OLD_BRANCH into $MAIN_BRANCH_NAME"

                # Delete the old branch after successful merge
                echo "Deleting old branch $OLD_BRANCH..."
                git branch -D $OLD_BRANCH
                echo "✅ Deleted old branch $OLD_BRANCH"
            else
                echo "❌ Failed to merge. Please resolve conflicts manually."

                # Restore stashed changes if needed
                if [ "$stashed" = true ]; then
                    echo "Applying stashed changes..."
                    git stash pop
                fi

                return 1
            fi
        fi
    elif [ "$CURRENT_BRANCH" = "$MAIN_BRANCH_NAME" ]; then
        echo "Already on $MAIN_BRANCH_NAME branch."
    else
        echo "Not on a copilot branch. Checking if main copilot branch exists..."

        # Check if main copilot-changes branch exists
        if git show-ref --verify --quiet refs/heads/$MAIN_BRANCH_NAME; then
            echo "Main $MAIN_BRANCH_NAME branch exists. Switching to it..."
            git checkout $MAIN_BRANCH_NAME
        else
            echo "Main $MAIN_BRANCH_NAME branch doesn't exist. Creating it..."
            git branch $MAIN_BRANCH_NAME
            git checkout $MAIN_BRANCH_NAME
            echo "✅ Created and switched to $MAIN_BRANCH_NAME branch"
        fi
    fi

    # Now create a new timestamped branch from the main copilot-changes branch
    if git checkout -b $NEW_BRANCH_NAME; then
        echo "✅ Created and switched to new branch in $repo_name: $NEW_BRANCH_NAME"
    else
        echo "❌ Failed to create new branch in $repo_name"
    fi

    # Restore stashed changes if needed
    if [ "$stashed" = true ]; then
        echo "Applying stashed changes..."
        git stash pop
    fi
}

# Manage branches in both repositories
manage_branch "$PARENT_DIR"

# Determine the sibling CLI repo path
if [ "$CURRENT_REPO" = "three-ecs-rpg" ]; then
    CLI_REPO_PATH="$(dirname "$PARENT_DIR")/three-ecs-rpg-cli"
elif [ "$CURRENT_REPO" = "three-ecs-rpg-cli" ]; then
    CLI_REPO_PATH="$(dirname "$PARENT_DIR")/three-ecs-rpg"
else
    echo "Unknown repository structure. Expected 'three-ecs-rpg' or 'three-ecs-rpg-cli'"
    exit 1
fi

# Manage branches in the CLI repo
manage_branch "$CLI_REPO_PATH"

echo "Branch management complete. Both repositories are now on branch: $NEW_BRANCH_NAME"
